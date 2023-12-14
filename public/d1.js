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
        if (method == 'POST') {
            console.log("posting");
        }
        var root = uri.startsWith('/') ? this.CF_API_URL : this.CF_API_URL + '/'
        console.log(`${method} ${uri}`)
        console.log(body)

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

        console.log(`options ${options}`, options)

        console.log('sending....' + root + uri)
        try {
            var r = await fetch(root + uri, options)
            console.log('d1 fetched ' + r.status)
            if (r.status == 200) {
                console.log('OK')
                var content = await r.text()
                var d1 = JSON.parse(content)
                //var d1 = await r.json()
                console.log(d1)
                return d1
            } else {
                const content = await r.text()
                console.log(
                    `error >${r.status}< :>${r.statusText}< ::>${content}<`
                )
                return null
            }
        } catch (e) {
            console.log('exception when requesting CF')
            console.log(e)
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
        console.log('projectInfo :', projectInfo)

        return projectInfo.result
    }

    async getD1Databases() {
        const list = await this.get(`/accounts/${this.accountId}/d1/database`)
        console.log(list.result)
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
                console.log(`deleteD1(${dbName}) : ${uri}`)
                var d1 = await this.del(uri)
                console.log('D1.js :: d1 deleted')
                console.log(d1)
                console.log('---------------------------------')
                return d1
            } else {
                console.log(`D1 ${dbName} not found`)
            }
        } catch (e) {
            console.log('error while deleting' + dbName, e)
        }
    }

    async deleteD1ByUuid(env, dbUuid) {
        try {
            const uri = `/accounts/${this.accountId}/d1/database/${dbUuid}`
            console.log(`deleteD1(${dbUuid}) : ${uri}`)
            var d1 = await del(uri)
            console.log('D1.js :: d1 deleted')
            console.log(d1)
            console.log('---------------------------------')
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
        console.log(`D1.js :: CreateD1(${dbName}) : ${uri}`)
        console.log(payLoad)
        var d1 = await this.post(uri, payLoad)
        console.log('D1.js :: d1 created')
        console.log(d1)
        console.log('---------------------------------')
        return d1
    }

    async executeSQL(sql, d1Id) {
        try {
            console.log(`D1.js :: d1.executeSQL(${sql},${d1Id})`)
            const uri = `/accounts/${this.accountId}/d1/database/${d1Id}/query`
            console.log(`D1.js ::  => ${uri}`)
            const result = await post(uri, { sql: sql })
            return result
        } catch (e) {
            console.log('D1.js :: error while executing SQL ', sql)
            console.log(e)
        }
    }

    async bindD1(d1Id, bindingName) {
        console.log(
            `bind project ${this.projectName} -- ${bindingName}-${d1Id}`
        )

        const project = await GetProject(this.projectName)

        const binding = project.deployment_configs.production.d1_databases
        binding[bindingName] = { id: d1Id }

        var payload = {
            deployment_configs: {
                production: {
                    d1_databases: binding,
                },
            },
        }

        var uri = `/accounts/${this.accountId}/pages/projects/${this.projectName}`
        console.log(`PATCH ${uri}`, payload)
        return await patch(uri, payload)
    }

    async unbindD1(d1Id) {
        console.log(
            `unbind project ${this.projectName} -- ${bindingName}-${d1Id}`
        )

        var database = await getD1DatabaseById(d1Id)
        var bindingName = database.name.toUpperCase()

        const project = await this.getProject()

        const binding = project.deployment_configs.production.d1_databases
        delete binding[bindingName]

        var payload = {
            deployment_configs: {
                production: {
                    d1_databases: binding,
                },
            },
        }

        var uri = `/accounts/${this.accountId}/pages/projects/${this.projectName}`
        console.log(`PATCH ${uri}`, payload)
        return await patch(uri, payload)
    }
}
