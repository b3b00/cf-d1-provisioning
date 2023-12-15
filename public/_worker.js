// NOTE : _worker.js must be place at the root of the output dir == ./public for this app

import { Router, withParams, withContent, error } from 'itty-router'
// import Mustache, { render } from 'mustache'
import {
    D1,
    withD1
} from './d1.js'

const router = Router()


const projectName = "cf-d1-provisioning";

export function errorResult(errors,result) {
    return {
        ok:false,
        errors:errors,
        result:result
    };
}

export function okResult(result) {
    return {
        ok:true,
        result:result
    };
}


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
            if (!db.ok) {
                return await renderInternalServorErrorJson(env,request,db);
            }
            const creation = `DROP TABLE IF EXISTS data;
            CREATE TABLE data (id INT PRIMARY KEY, value TEXT);
            INSERT INTO data VALUES (1,'first data')`;
            const sql = await d1.executeSQL(creation, db.result.result.uuid)
            if (!sql.ok) {
                return await renderInternalServorErrorJson(env,request,sql);
            }
            const bind = await d1.bindD1(db.result.result.uuid, d1Name.toUpperCase())
            if (!bind.ok) {
                return await renderInternalServorErrorJson(env,request,bind);
            }
            return await renderOkJson(env, request, okResult({
                "d1": db,
                "bind": bind,
                "sql": sql,                
            }));
        }
        return await renderBadRequestJson(env, request, errorResult(['no tenant name'],null));        
    } catch (e) {
        return await renderInternalServorErrorJson(env,request,            
            errorResult([`error while provisioning D1 for :>${tenant}}<`,e.message],null));
    }
})

// get all databases
router.get('/d1', withParams, withD1(), async (request, env) => {

    let d1 = request.D1;

    try {

        let project = await d1.getProject();
        if (!project.ok) {
            return await renderInternalServorErrorJson(env,request,project);
        }
        let databases = await d1.getD1Databases(env);
        if (!databases.ok) {
            return await renderInternalServorErrorJson(env,request,databases);
        }
        const bindings = project?.result?.result?.deployment_configs?.production?.d1_databases;
        if (bindings) {
            var uuids = Object.values(bindings).map(x => x.id);
            databases = databases.result.result.filter(x => uuids.includes(x.uuid));        
            return await renderOkJson(env,request,okResult(databases))
        }
        else {
            return await renderOkJson(env,request,okResult([]));
        }
    } catch (e) {        
        return await renderInternalServorErrorJson(env,request,
            errorResult([`error while getting databases for ${request.projectName}`,e.message],null));            
    }
})

// delete a database
router.delete('/d1/:tenant', withParams, withD1(), async (request, env) => {

    let d1 = request.D1;

    const tenant = request.params.tenant
    try {        
        console.log(`delete D1 for :>${tenant}<`)
        if (tenant) {
	        var r = await d1.unbindD1(tenant);
            if(!r.ok) {
                return renderInternalServorErrorJson(env,request,r);
            }
            const d1Uuid = `${tenant}`
            const deleted = await d1.deleteD1ByUuid(d1Uuid);
            if (!deleted.ok) {
                return renderInternalServorErrorJson(env,request,deleted);
            }
            return await renderOkJson(env,request,okResult(deleted));        
        }
        return await renderBadRequestJson(env, request, errorResult(['no tenant name' ],null))
    } catch (e) {

        return await renderInternalServorErrorJson(env,request,
            error([`error while deleting D1 for >${tenant}}< in project >${request.projectName}<`,e.message],null)
            );        
    }
})

// get all data for the given tenant
router.get('/d1/:tenant', withParams, withD1(), async (request, env) => {
    try {
        const tenant = request.params.tenant    
        var d1Fromcontext = env[tenant.toUpperCase()];    
        if (!d1Fromcontext) {
            return renderBadRequestJson(env,request,errorResult([`no bound D1 for ${tenant}`],null));
        }
        const { results } = await d1Fromcontext.prepare('SELECT * FROM data').all()
        return await renderOkJson(env, request, okResult(results))
    } catch (e) {
        return await renderInternalServorErrorJson(env, request, 
            errorResult([`error while getting data for >${tenant}}< in project >${request.projectName}<`,e.message],null)
            );
    }
})

// add a data row for a given tenant
// should be a PUT
router.put('/d1/:tenant', withParams, withContent, withD1(), async (request, env) => {

    try {
        var tenant = request.params.tenant
        var data = await request.json()
        var d1Fromcontext = env[tenant.toUpperCase()]
        if (!d1Fromcontext) {
            return renderBadRequestJson(env,request,errorResult([`no bound D1 for ${tenant}`],null));
        }
        await d1Fromcontext
            .prepare(
                'INSERT INTO data (id, value) VALUES (?1, ?2)'
            )
            .bind(data.id,data.data)
            .run();
        return renderOkJson(env,request,{});
    } catch (e) {
        return await renderInternalServorErrorJson(env,request,
            errorResult([`error while updating data for >${tenant}}< in project >${request.projectName}<`,e.message],null));            
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
