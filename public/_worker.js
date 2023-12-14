// NOTE : _worker.js must be place at the root of the output dir == ./public for this app

import { Router, withParams, withContent } from 'itty-router'
// import Mustache, { render } from 'mustache'
import {
    D1
} from './d1.js'

const router = Router()


const projectName = "cf-d1-provisioning";


async function RenderJSON(env, request, data) {
    const payload = JSON.stringify(data);
    var response = new Response(payload);
    response.headers.set('Content-Type', 'application/json')
    return response
}


// provision and bind a D1 instance with given tenant name
// should be a POST !
router.post('/d1/:tenant', withParams, withContent, async (request, env) => {

    let d1Api = new D1(env.ACCOUNT_ID,env.API_KEY,projectName);

    const tenant = request.params.tenant
    try {        
        var logs = []
        console.log(`new D1 for :>${tenant}<`)
        logs.push(`new D1 for :>${tenant}<`)
        if (tenant) {            
            let d1Name = `D1_${tenant}`
            logs.push(`D1 Name :>${d1Name}<`)
            console.log(`D1 Name :>${d1Name}<`)
            var d1 = await d1Api.createD1(d1Name)
            logs.push(`d1 created :>${d1.result.uuid}<`)
            console.log(`d1 created :>${d1.result.uuid}<`)
            var creation = `DROP TABLE IF EXISTS data;
            CREATE TABLE data (id INT PRIMARY KEY, value TEXT);
            INSERT INTO data VALUES (1,'first data')`;
            let sql = await d1Api.executeSQL(creation, d1.result.uuid)
            logs.push(`sql create executed`)            
            console.log(`sql create executed`)
            bind = await d1Api.bindD1(d1.result.uuid, d1Name.toUpperCase())
            logs.push(`d1 :>${d1.result.uuid}< bound to :>${projectName}<`)
            console.log(`d1 :>${d1.result.uuid}< bound to :>${projectName}<`)
            return await RenderJSON(env, request, {
                "d1": d1,
                "bind": bind,
                "sql": sql,
                "logs": logs
            })
        }
        return await RenderJSON(env, request, { error: 'no tenant name', logs: logs })
    } catch (e) {
        return {
            error: `error while provisioning D1 for :>${tenant}}<`,
            exception: e,
        }
    }
})

// get all databases
router.get('/d1', withParams, async (request, env) => {

    let d1Api = new D1(env.ACCOUNT_ID,env.API_KEY,projectName);

    try {

        console.log('==================================================')
        console.log(`==   GET PROJECT ${projectName} ==============`)
        console.log('==================================================')
        let project = await d1Api.getProject(env,projectName);
        console.log(project);
        console.log('=================================')
        console.log('getting all databases from CF');
        let databases = await d1Api.getD1Databases(env)
        databases = databases.filter(x => x.name.startsWith("D1_"));
        console.log(databases);
        return await RenderJSON(env,request,databases)
    } catch (e) {
        console.log(e);
        return await RenderJSON(env,request,{"exception":e});
    }
})

// delete a database
router.delete('/d1/:tenant', withParams, async (request, env) => {

    let d1Api = new D1(env.ACCOUNT_ID,env.API_KEY,projectName);

    const tenant = request.params.tenant
    try {        
        var logs = []
        console.log(`delete D1 for :>${tenant}<`)
        logs.push(`delete D1 for :>${tenant}<`)
        if (tenant) {
	    await d1Api.unbindD1(env,tenant,projectName);
            let d1Uuid = `${tenant}`
            var d1 = await d1Api.deleteD1ByUuid(env, d1Uuid)            
        }
        return await RenderJSON(env, request, { error: 'no tenant name', logs: logs })
    } catch (e) {
        console.log(`error while deleting D1 for :>${tenant}}<`)
        console.log(e)
    }
})

// get all data for the given tenant
router.get('/d1/:tenant', withParams, async (request, env) => {
    const tenant = request.params.tenant    
    console.log(`getting data for tenant <${tenant}>`)
    

    console.log("---------------------------")
    console.log('getting through env["D1_DALI"]');
    var d1Fromcontext = env[tenant.toUpperCase()];    
    console.log('d1Fromcontext', d1Fromcontext)
    const { results } = await d1Fromcontext.prepare('SELECT * FROM data').all()
    console.log(results)
    console.log("---------------------------")

    return await RenderJSON(env, request, results)
})

// add a data row for a given tenant
// should be a PUT
router.put('/d1/:tenant', withParams, withContent, async (request, env) => {

    try {
        var tenant = request.params.tenant
        var data = await request.json()
        console.log('*************************************')
        console.log('*************************************')
        var d1Fromcontext = env[tenant.toUpperCase()]
        console.log('d1Fromcontext', d1Fromcontext)
        await d1Fromcontext
            .prepare(
                'INSERT INTO data (id, value) VALUES (?1, ?2)'
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
