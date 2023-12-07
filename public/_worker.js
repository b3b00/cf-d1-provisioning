// NOTE : _worker.js must be place at the root of the output dir == ./public for this app

import { Router, withParams } from 'itty-router'
// import Mustache, { render } from 'mustache'
import {createD1,bindD1,executeSQL} from './d1.js'

const router = Router()

async function GetFromOrCatchOrFetch(request, ttl, fetcher) {
    let cache = caches.default;
    var cached = await cache.match(request);
    if (cached) {
        return cached;
    }
    console.log(`getOrFetch : fetching`);
    var response = await fetcher();
    console.log(`getOrFetch : fetched`,response);

    response.headers.set('Cache-Control', `max-age:${ttl}`);    
    console.log(`getOrFetch : caching`);
    // NOTE : when using cache the reponse MUST be cloned before put to cache
    cache.put(request,response.clone());
    
    return response;
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
    var response = new Response(JSON.stringify(data));
    response.headers.set('Content-Type', 'application/json');
    return response;
}

// async function RenderHtml(env, request, templatePath, view) {
//     return RenderTemplate(env, request, templatePath, view, 'text/html')
// }



// provision and bind a D1 instance with given tenant name
// should be a POST !
router.get(
    '/d1/new/:tenant',
    withParams,
    async (request, env, context, tenant) =>
        {
            if (tenant) {
            let accountId = env.API_KEY
            let d1Name = `D1_${tenant}`;
            var d1id = createD1(env,d1Name);
            var creation = `drop table if exists data;
            create table data (id INT PRIMARY KEY, value TEXT);`;
            sql = await ExecuteSQL(context, creation, d1.result.uuid);
            bind = await BindD1(context, d1.result.uuid, appName);
            RenderJSON(env,request,{"d1":d1,"bind":bind});
            }
            return RenderJSON(env,request,{"error":"no tenant name"});
        }
)



// get all data for the given tenant
router.get('/d1/:tenant',
withParams,
async (request, env, tenant) =>
    {
        return RenderJSON(env,request,["data1","data2","data3"]);
    }
)


// add a data row for a given tenant
// should be a PUT
router.get('/d1/set/:tenant/:data',
withParams,
async (request, env, context, tenant, data) =>
    {
        return RenderJSON(env,request,{});
    })

router.all('*', (request, env) => {
    console.log('assets handler');
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