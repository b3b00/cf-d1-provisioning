import { Guid } from "guid-typescript";

import { RouteHandler } from "itty-router";
import { ProjectInfo, DeploymentConfig, D1, D1Result, EnvVarType } from "./types";
export function error<T>(errors:string[],result:T = null) : D1Result<T> {
    return {
        ok:false,
        errors:errors,
        result:result
    };
}


export function ok<T>(result)  : D1Result<T>{
    return {
        ok:true,
        result:result,
        errors:[]
    };
}

export function withD1ForProjectAndAuthentication(projectName:string, accountId:Guid, apiKey:string) {
    return (request, env) => {
        let d1 = new D1Client(accountId,apiKey,projectName);
        request.D1 = d1;
        request.projectName = projectName;
    }
}

export function withD1ForProject(projectName) {
    return (request, env) => {
        let d1 = new D1Client(env.ACCOUNT_ID,env.API_KEY,projectName);
        request.D1 = d1;
        request.projectName = projectName;
    };    
}


export function withD1():RouteHandler {
    return (request, env) => {
        let d1 = new D1Client(env.ACCOUNT_ID,env.API_KEY,env.PROJECT_NAME);
        request.D1 = d1;
        request.projectName = env.PROJECT_NAME;
    };     
};


export class D1Client {
    CF_API_URL = 'https://api.cloudflare.com/client/v4'

    accountId : Guid;

    apiKey : string;

    projectName : string;

    constructor(accountId:Guid, apiKey:string, projectName:string) {
        this.projectName = projectName
        this.accountId = accountId
        this.apiKey = apiKey
    }

    ///accounts/${accountId}/d1/database/${dbUuid}/query
    async request<T>(uri:string, method:string, body:any) : Promise<D1Result<T>> {
        var root = uri.startsWith('/') ? this.CF_API_URL : this.CF_API_URL + '/'

        var options = {
            method: method,
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
            },
	    body: (body ?? undefined)
            //       mode: 'cors',
            //     cache: 'default',
        }
        if (body) {
            options.body = JSON.stringify(body)
        }

        try {
            var r = await fetch(root + uri, options)
            if (r.status == 200) {
                var content = await r.text()
                var data = JSON.parse(content) 
                return ok(data.result as T);                
            } else {
                const content = await r.json()

                return error([`request ${uri} returned ${r.status} - ${r.statusText}`],content);
            }
        } catch (e) {
            return error([`request ${uri} raised ${e.message}`],null);
        }
    }

    async post<T>(uri:string, body:T) : Promise<D1Result<T>> {
        return await this.request<T>(uri, 'POST', body)
    }

    async patch<T>(uri:string, body:T) {
        return await this.request(uri, 'PATCH', body)
    }

    async get<T>(uri:string) : Promise<D1Result<T>> {
        return await this.request<T>(uri, 'GET', undefined);
    }

    async del(uri:string) {
        return await this.request(uri, 'DELETE', undefined)
    }

    async getProject() : Promise<D1Result<ProjectInfo>> {
        var projectInfo = await this.get<ProjectInfo>(
            `/accounts/${this.accountId}/pages/projects/${this.projectName}`
        )        
        console.log("PROJECT");
        console.log(projectInfo);
        return projectInfo;        
    }

    async getD1Databases() : Promise<D1Result<D1[]>> {
        const list = await this.get<D1[]>(`/accounts/${this.accountId}/d1/database`)
        console.log("DATABASES");
        console.log(list);
        return list;
    }

    async getD1Database(name:string) : Promise<D1Result<D1>> {
        const databases = await this.getD1Databases()
        if (databases.ok) {
            const database = databases.result.filter(x => x.name == name);
            if (database !== undefined && database !== null && database.length > 0) {
                return {
                    ok:true,
                    result:database[0]
                } as D1Result<D1>;
            }
            else {
                const empty = Guid.parse(Guid.EMPTY);
                return error<D1>([`database ${name} not found`],{uuid:empty,name:undefined});
            }            
        }
        return {ok:false,errors:databases.errors,result:undefined};
    }

    async getD1DatabaseById(id:Guid) {
        const databases = await this.getD1Databases()

        if (databases.ok) {
            let database = databases.result.filter(x => x.uuid == id);
            if (database !== undefined && database !== null && database.length > 0) {
                return {
                    ok:true,
                    result:database[0]
                };
            }
            else {
                return error([`database ${id} not found`],null);
            }            
        }
        return databases;
    }

    async deleteD1ByName(dbName:string) {
        try {
            var d1 = await this.getD1Database(dbName)
            if (d1.ok) {
                const uri = `/accounts/${this.accountId}/d1/database/${d1.result.uuid}`
                const deleted = await this.del(uri)
                return deleted
            } else {
                return d1;
            }
        } catch (e) {
            return error(['error while deleting' + dbName],{"exception":e});            
        }
    }

    async deleteD1ByUuid(dbUuid:Guid) {
        try {
            const uri = `/accounts/${this.accountId}/d1/database/${dbUuid}`
            var d1 = await this.del(uri)
            return d1
        } catch (e) {
            return error(['error while deleting' + dbUuid],{exception:e});                 
        }
    }

    async createD1(dbName:string) : Promise<D1Result<D1>> {
        var payLoad:D1 = {
            name: dbName,
            uuid: Guid.parse(Guid.EMPTY)
        }
        const uri = `/accounts/${this.accountId}/d1/database`
        var d1 = await this.post<D1>(uri, payLoad)
        return d1
    }

    async executeSQL(sql:string, d1Id:Guid) {
        try {
            const uri = `/accounts/${this.accountId}/d1/database/${d1Id}/query`
            const result = await this.post(uri, { sql: sql })
            return result;
        } catch (e) {
            return error([`D1.js :: error while executing SQL ${sql}`],{exception:e});                     
        }
    }

    async bindD1(d1Id:Guid, bindingName:string) {

        const project = await this.getProject()
        if (!project.ok) {
            return project;
        }

        const production = project.result.deployment_configs.production

        if (production) {
            let binding = {}
            if (production.d1_databases) {
                binding = production.d1_databases
            }
            binding[bindingName] = { id: d1Id }

            var payload = {
                deployment_configs: {
                    production: {
                        d1_databases: binding,
                    },
                },
            }

            var uri = `/accounts/${this.accountId}/pages/projects/${this.projectName}`
            return await this.patch(uri, payload)
        }
        else {
            return error([`no production deployment config found for ${this.projectName}`],project);
        }
    }

    async unbindD1(d1Id:Guid) {
        console.log(
            `unbind project ${this.projectName} --- ${d1Id}`
        )

        var database = await this.getD1DatabaseById(d1Id)
        if (!database.ok) {
            return database;
        }
        var bindingName = database.result.name.toUpperCase()

        

        const project = await this.getProject();
        if (!project.ok) {
            return project;
        }

        const binding = project?.result?.deployment_configs?.production?.d1_databases;
        

        // do not try to unbind if not bound
        if (
            binding !== null &&
            binding !== undefined &&
            bindingName in binding
        ) {
            binding[bindingName] = null;


            let payload = {
                deployment_configs: {
                    production: {
                        d1_databases: binding,
                    },
                },
            }

            if (Object.keys(binding).length == 0) {
                let payload = {
                    deployment_configs: {
                        production: {                            
                        },
                    },
                }
            }

            console.log(`UNBIND ${bindingName} PAYLOAD :` ,payload);

            var uri = `/accounts/${this.accountId}/pages/projects/${this.projectName}`
            let patched = await this.patch(uri, payload)
            return ok(patched);
        }
        else {
            return error([`no D1 binding found for ${this.projectName}`],project);
        }
    }

    async createProject(tenant : string) {
        const tenantProjectName = `${tenant}_tenant`;
        let d1Result = await this.createD1(`D1_${tenant}`);
        if (d1Result.ok) {
            let d1 = d1Result.result;
        let projectResult = await this.getProject() ;
        if (projectResult.ok) {
         let project = projectResult.result;
         project.name=tenantProjectName;
         project.canonical_deployment=null;
         project.deployment_configs.production.d1_databases.set(`D1_${tenant.toUpperCase}`,d1);
         project.deployment_configs.production.env_vars.clear();
         project.deployment_configs.production.env_vars.set('PROJECT_NAME',{"type":EnvVarType.PlainText,"value":tenantProjectName});
         project.deployment_configs.production.env_vars.set('API_KEY',{"type":EnvVarType.Secret,"value":this.apiKey});
         project.deployment_configs.production.env_vars.set('ACCOUNT_ID',{"type":EnvVarType.Secret,"value":this.accountId.toString()});
        }
    }
        
    }
}
