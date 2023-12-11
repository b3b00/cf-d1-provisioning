// NOTE : _worker.js must be place at the root of the output dir == ./public for this app

import { Router, withParams, withContent } from 'itty-router'
// import Mustache, { render } from 'mustache'
import {
    createD1,
    bindD1,
    executeSQL,
    deleteD1ByName,
    deleteD1ByUuid,
    getD1Database,
    getD1Databases,
} from './d1.js'

const router = Router()

async function GetFromOrCatchOrFetch(request, ttl, fetcher) {
    let cache = caches.default
    var cached = await cache.match(request)
    if (cached) {
        return cached
    }
    console.log(`getOrFetch : fetching`)
    var response = await fetcher()
    console.log(`getOrFetch : fetched`, response)

    response.headers.set('Cache-Control', `max-age:${ttl}`)
    console.log(`getOrFetch : caching`)
    // NOTE : when using cache the reponse MUST be cloned before put to cache
    cache.put(request, response.clone())

    return response
}

// async function RenderTemplate(env, request, templatePath, view, mimeType) {
//     var url = new URL(request.url)
//     var templateUrl = `${url.origin}/${templatePath}`
//     var templateRequest = new Request(templateUrl, request)
//     var response = await env.ASSETS.fetch(templateRequest)
//     var text = await response.text()
//     var output = Mustache.render(text, view)
//     var response = new Response(output)
//     response.headers.set('Content-Type', mimeType)
//     return response
// }

async function RenderJSON(env, request, data) {
    var response = new Response(JSON.stringify(data))
    response.headers.set('Content-Type', 'application/json')
    return response
}

// async function RenderHtml(env, request, templatePath, view) {
//     return RenderTemplate(env, request, templatePath, view, 'text/html')
// }

// provision and bind a D1 instance with given tenant name
// should be a POST !
router.post('/d1/:tenant', withParams, withContent, async (request, env) => {
    const tenant = request.params.tenant
    try {
        const appName = 'cf-d1-provisioning'
        var logs = []
        console.log(`new D1 for :>${tenant}<`)
        logs.push(`new D1 for :>${tenant}<`)
        if (tenant) {
            let accountId = env.API_KEY
            logs.push(`accountId :>${accountId}<`)
            console.log(`accountId :>${accountId}<`)
            let d1Name = `D1_${tenant}`
            logs.push(`D1 Name :>${d1Name}<`)
            console.log(`D1 Name :>${d1Name}<`)
            var d1 = await createD1(env, d1Name)
            logs.push(`d1 created :>${d1.result.uuid}<`)
            console.log(`d1 created :>${d1.result.uuid}<`)
            var creation = `drop table if exists data;
            create table data (id INT PRIMARY KEY, value TEXT);`
            sql = await executeSQL(env, creation, d1.result.uuid)
            logs.push(`sql create executed`)
            console.log(`sql create executed`)
            bind = await bindD1(env, d1.result.uuid, appName)
            logs.push(`d1 :>${d1.result.uuid}< bound to :>${appName}<`)
            console.log(`d1 :>${d1.result.uuid}< bound to :>${appName}<`)
            RenderJSON(env, request, {
                d1: d1,
                bind: bind,
                sql: sql,
                logs: logs,
            })
        }
        return RenderJSON(env, request, { error: 'no tenant name', logs: logs })
    } catch (e) {
        return {
            error: `error while provisioning D1 for :>${tenant}}<`,
            exception: e,
        }
    }
})

// get all databases
router.getAll('/d1', withParams, async (request, env) => {
    try {
        console.log('getting all databases from CF');
        const databases = await getD1Databases(env)
        console.log(databases);
        return await RenderJSON(databases)
    } catch (e) {}
})

// delete a database
router.delete('/d1/:tenant', withParams, async (request, env) => {
    const tenant = request.params.tenant
    try {
        const appName = 'cf-d1-provisioning'
        var logs = []
        console.log(`delete D1 for :>${tenant}<`)
        logs.push(`delete D1 for :>${tenant}<`)
        if (tenant) {
            let accountId = env.API_KEY
            logs.push(`accountId :>${accountId}<`)
            console.log(`accountId :>${accountId}<`)
            let d1Uuid = `D1_${tenant}`
            var d1 = await deleteD1ByUuid(env, d1Uuid)
            logs.push(`d1 deleted :>${d1.result.uuid}<`)
            console.log(`d1 deleted :>${d1.result.uuid}<`)
        }
        return RenderJSON(env, request, { error: 'no tenant name', logs: logs })
    } catch (e) {
        console.log(`error while deleting D1 for :>${tenant}}<`)
        console.log(e)
    }
})

// get all data for the given tenant
router.get('/d1/:tenant', withParams, async (request, env) => {
    const tenant = request.params.tenant
    console.log(`getting data for tenant <${tenant}>`)

    var d1Fromcontext = env['D1_' + tenant]
    console.log('d1Fromcontext', d1Fromcontext)
    const { results } = await d1Fromcontext.prepare('SELECT * FROM data').all()
    console.log(results)

    return RenderJSON(env, request, { tenant: ['data1', 'data2', 'data3'] })
})

// add a data row for a given tenant
// should be a PUT
router.post('/d1/:tenant', withParams, withContent, async (request, env) => {
    try {
        var tenant = request.params.tenant
        var data = await request.json()
        console.log('*************************************')
        console.log('*************************************')
        var d1Fromcontext = context.env[d1Name]
        console.log('d1Fromcontext', d1Fromcontext)
        await d1Fromcontext
            .prepare(
                'INSERT INTO data (id, data) VALUES (?1, ?2, ?3, ?4)'
            )
            .bind(data.id,data.data)
            .run()
    } catch (e) {
        console.log(e)
    }
})

router.all('*', (request, env) => {
    console.log('assets handler')
    return env.ASSETS.fetch(request)
})

export default {
    async fetch(request, environment, context) {
        return router.handle(request, environment, context)
    },
    async scheduled(controller, environment, context) {
        // await doATask();
    },
}
