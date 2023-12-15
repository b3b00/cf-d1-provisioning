

export function withD1ForProjectAndAuthentication(projectName, accountId, apiKey) {
    return (request, env) => {
        let d1Api = new D1(accountId,apiKey,projectName);
        request.D1 = d1Api;
    }
}

export function withD1ForProject(projectName) {
    return (request, env) => {
        let d1Api = new D1(env.ACCOUNT_ID,env.API_KEY,projectName);
        request.D1 = d1Api;
    };    
}


export function withD1(request, env) {
    return (request, env) => {
        let d1Api = new D1(env.ACCOUNT_ID,env.API_KEY,env.PROJECT_NAME);
        request.D1 = d1Api;
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
                var d1 = JSON.parse(content)
                //var d1 = await r.json()
                return d1;
            } else {
                const content = await r.text()
                return null
            }
        } catch (e) {
            return null
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

        return projectInfo.result
    }

    async getD1Databases() {
        const list = await this.get(`/accounts/${this.accountId}/d1/database`)
        return list.result
    }

    async getD1Database(name) {
        const databases = await this.getD1Databases()
        const d1 = databases.filter(x => x.name == name)[0]
        return d1
    }

    async getD1DatabaseById(id) {
        const databases = await this.getD1Databases()
        const d1 = databases.filter(x => x.uuid == id)[0]
        return d1
    }

    async deleteD1ByName(dbName) {
        try {
            var d1 = await this.getD1Database(env, dbName)
            if (d1) {
                const uri = `/accounts/${this.accountId}/d1/database/${d1.uuid}`
                var d1 = await this.del(uri)
                return d1
            } else {
                console.log(`D1 ${dbName} not found`)
            }
        } catch (e) {
            console.log('error while deleting' + dbName, e)
        }
    }

    async deleteD1ByUuid(dbUuid) {
        try {
            const uri = `/accounts/${this.accountId}/d1/database/${dbUuid}`
            var d1 = await this.del(uri)
            return d1
        } catch (e) {
            console.log('error while deleting' + dbUuid, e)
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
            return result
        } catch (e) {
            console.log('D1.js :: error while executing SQL ', sql)
            console.log(e)
        }
    }

    async bindD1(d1Id, bindingName) {

        const project = await this.getProject()

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
    }

    async unbindD1(d1Id) {
        console.log(
            `unbind project ${this.projectName} --- ${d1Id}`
        )

        var database = await this.getD1DatabaseById(d1Id)
        var bindingName = database.name.toUpperCase()

        console.log(
            `unbind project ${this.projectName} --- ${bindingName}`
        )

        const project = await this.getProject()

        const binding = project?.deployment_configs?.production?.d1_databases;

        // do not try to unbind if not bound
        if (
            binding !== null &&
            binding !== undefined &&
            bindingName in binding
        ) {
            delete binding[bindingName]


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
            console.log(`UNBIND ${bindingName} result :` ,patched);
        }
    }
}
