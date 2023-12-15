// NOTE : _worker.js must be place at the root of the output dir == ./public for this app

import { Router, withParams, withContent, error } from 'itty-router'
// import Mustache, { render } from 'mustache'
import {
    D1,
    withD1
} from './d1.js'

const router = Router()


const projectName = "cf-d1-provisioning";


async function renderOkJson(env, request, data) {
    let response = await renderJson(env,request,data);     
    return response;
}

async function renderInternalServorErrorJson(env, request, data) {
    return error(500,data);
}

async function renderBadRequestJson(env, request, data) {
    return error(400,data);
}

async function renderJson(env, request, data) {
    const payload = JSON.stringify(data);
    var response = new Response(payload);
    response.headers.set('Content-Type', 'application/json')
    return response
}


// provision and bind a D1 instance with given tenant name
// should be a POST !
router.post('/d1/:tenant', withParams, withContent,withD1(), async (request, env) => {

    let d1 = request.D1;

    const tenant = request.params.tenant
    try {        
        if (tenant) {            
            const d1Name = `D1_${tenant}`
            const db = await d1.createD1(d1Name)
            const creation = `DROP TABLE IF EXISTS data;
            CREATE TABLE data (id INT PRIMARY KEY, value TEXT);
            INSERT INTO data VALUES (1,'first data')`;
            const sql = await d1.executeSQL(creation, db.result.uuid)
            const bind = await d1.bindD1(db.result.uuid, d1Name.toUpperCase())
            return await renderOkJson(env, request, {
                "success":true,
                "d1": db,
                "bind": bind,
                "sql": sql,                
            })
        }
        return await renderBadRequestJson(env, request, { 
            "success":false,
            error: 'no tenant name'
        }
        );
    } catch (e) {
        return await renderInternalServorErrorJson(env,request,{
            success:false,
            error: `error while provisioning D1 for :>${tenant}}<`,
            exception: e.message,
        });
    }
})

// get all databases
router.get('/d1', withParams, withD1(), async (request, env) => {

    let d1 = request.D1;

    try {

        let project = await d1.getProject();
        let databases = await d1.getD1Databases(env)
        const bindings = project?.deployment_configs?.production?.d1_databases;
        var uuids = Object.values(bindings).map(x => x.id);
        databases = databases.filter(x => uuids.includes(x.uuid));
        return await renderOkJson(env,request,databases)
    } catch (e) {
        console.log(e);
        return await renderInternalServorErrorJson(env,request,
            {
                "message":`error while getting databases for ${request.projectName}`,
                "success":false,
                "exception":e.message
            });
    }
})

// delete a database
router.delete('/d1/:tenant', withParams, withD1(), async (request, env) => {

    let d1 = request.D1;

    const tenant = request.params.tenant
    try {        
        console.log(`delete D1 for :>${tenant}<`)
        if (tenant) {
	    await d1.unbindD1(tenant);
            const d1Uuid = `${tenant}`
            const deleted = await d1.deleteD1ByUuid(d1Uuid);
            return await renderOkJson(env,request,{success:true,deletedD1:deleted});        
        }
        return await renderBadRequestJson(env, request, { success:false,message: 'no tenant name' })
    } catch (e) {

        return await renderInternalServorErrorJson(env,request,
            {
                message : `error while deleting D1 for >${tenant}}< in project >${request.projectName}<`,
                exception:e.message,
                success:false
            });        
    }
})

// get all data for the given tenant
router.get('/d1/:tenant', withParams, withD1(), async (request, env) => {
    const tenant = request.params.tenant    
    var d1Fromcontext = env[tenant.toUpperCase()];    
    const { results } = await d1Fromcontext.prepare('SELECT * FROM data').all()
    return await renderOkJson(env, request, results)
})

// add a data row for a given tenant
// should be a PUT
router.put('/d1/:tenant', withParams, withContent, withD1(), async (request, env) => {

    try {
        var tenant = request.params.tenant
        var data = await request.json()
        var d1Fromcontext = env[tenant.toUpperCase()]
        await d1Fromcontext
            .prepare(
                'INSERT INTO data (id, value) VALUES (?1, ?2)'
            )
            .bind(data.id,data.data)
            .run();
        return renderOkJson(env,request,{});
    } catch (e) {
        return await renderInternalServorErrorJson(env,request,
            {
                message : `error while updating data for >${tenant}}< in project >${request.projectName}<`,
                exception:e.message,
                success:false
            });     
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
