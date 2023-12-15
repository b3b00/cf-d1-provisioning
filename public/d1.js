

export function error(errors,result) {
    return {
        ok:false,
        errors:errors,
        result:result
    };
}

export function ok(result) {
    return {
        ok:true,
        result:result
    };
}

export function withD1ForProjectAndAuthentication(projectName, accountId, apiKey) {
    return (request, env) => {
        let d1 = new D1(accountId,apiKey,projectName);
        request.D1 = d1;
        request.projectName = projectName;
    }
}

export function withD1ForProject(projectName) {
    return (request, env) => {
        let d1 = new D1(env.ACCOUNT_ID,env.API_KEY,projectName);
        request.D1 = d1;
        request.projectName = projectName;
    };    
}


export function withD1(request, env) {
    return (request, env) => {
        let d1 = new D1(env.ACCOUNT_ID,env.API_KEY,env.PROJECT_NAME);
        request.D1 = d1;
        request.projectName = env.PROJECT_NAME;
    };     
};

export class D1 {
    CF_API_URL = 'https://api.cloudflare.com/client/v4'

    accountId

    apiKey

    projectName

    constructor(accountId, apiKey, projectName) {
        this.projectName = projectName
        this.accountId = accountId
        this.apiKey = apiKey
    }

    ///accounts/${accountId}/d1/database/${dbUuid}/query
    async request(uri, method, body) {
        var root = uri.startsWith('/') ? this.CF_API_URL : this.CF_API_URL + '/'

        var options = {
            method: method,
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
            },
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
                return {
                    ok:true,
                    result:data
                };                
            } else {
                const content = await r.json()

                return error(`request ${uri} returned ${result.status} - ${result.statusText}`,content);
            }
        } catch (e) {
            return error(`request ${uri} raised ${e.message}`);
        }
    }

    async post(uri, body) {
        return await this.request(uri, 'POST', body)
    }

    async patch(uri, body) {
        return await this.request(uri, 'PATCH', body)
    }

    async get(uri) {
        return await this.request(uri, 'GET', undefined)
    }

    async del(uri) {
        return await this.request(uri, 'DELETE', undefined)
    }

    async getProject() {
        var projectInfo = await this.get(
            `/accounts/${this.accountId}/pages/projects/${this.projectName}`
        )        
        return projectInfo;        
    }

    async getD1Databases() {
        const list = await this.get(`/accounts/${this.accountId}/d1/database`)
        return list
    }

    async getD1Database(name) {
        const databases = await this.getD1Databases()
        if (databases.ok) {
            database = databases.result.result.filter(x => x.name == name);
            if (database !== undefined && database !== null && database.length > 0) {
                return {
                    ok:true,
                    result:database[0]
                };
            }
            else {
                return error([`database ${name} not found`],{});
            }            
        }
        return databases;
    }

    async getD1DatabaseById(id) {
        const databases = await this.getD1Databases()

        if (databases.ok) {
            let database = databases.result.result.filter(x => x.uuid == id);
            if (database !== undefined && database !== null && database.length > 0) {
                return {
                    ok:true,
                    result:database[0]
                };
            }
            else {
                return error([`database ${id} not found`],{});
            }            
        }
        return databases;
    }

    async deleteD1ByName(dbName) {
        try {
            var d1 = await this.getD1Database(env, dbName)
            if (d1.ok) {
                const uri = `/accounts/${this.accountId}/d1/database/${d1.uuid}`
                var d1 = await this.del(uri)
                return d1
            } else {
                return d1;
            }
        } catch (e) {
            return error(['error while deleting' + dbName],{exception:e});            
        }
    }

    async deleteD1ByUuid(dbUuid) {
        try {
            const uri = `/accounts/${this.accountId}/d1/database/${dbUuid}`
            var d1 = await this.del(uri)
            return d1
        } catch (e) {
            return error(['error while deleting' + dbUuid],{exception:e});                 
        }
    }

    async createD1(dbName) {
        var payLoad = {
            name: dbName,
        }
        const uri = `/accounts/${this.accountId}/d1/database`
        var d1 = await this.post(uri, payLoad)
        return d1
    }

    async executeSQL(sql, d1Id) {
        try {
            const uri = `/accounts/${this.accountId}/d1/database/${d1Id}/query`
            const result = await this.post(uri, { sql: sql })
            return result;
        } catch (e) {
            return error([`D1.js :: error while executing SQL ${sql}`],{exception:e});                     
        }
    }

    async bindD1(d1Id, bindingName) {

        const project = await this.getProject()
        if (!project.ok) {
            return project;
        }

        const production = project.deployment_configs.production

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

    async unbindD1(d1Id) {
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
            return error([`no D1 binding found for ${this.projectName}`,project]);
        }
    }
}
