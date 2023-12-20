// NOTE : _worker.js must be place at the root of the output dir == ./public for this app

import { Router, withParams, withContent, error, IRequest } from 'itty-router'
import {KVNamespace, ExecutionContext } from '@cloudflare/workers-types'
import {
    D1Client,
    withD1
} from './src/d1.js'
import {D1,D1Result,CFResult,ProjectInfo} from './src/types';


// define a custom RequestType
type D1Request = {
  d1: D1,
  params: any
} & IRequest

// declare what's available in our env
type Env = {
  KV: KVNamespace
}
  
  // create a convenient duple
  type CF = [env: Env, context: ExecutionContext]

const router = Router()


const projectName = "cf-d1-provisioning";

enum ErrorType {
    client,
    server,
    NoError
}

interface ProvisionResult {
    errorType : ErrorType;
    ok : boolean;
    errors : string[]
    result : any;
}

type MyFunc = <T>(b: D1Result<T>) => ProvisionResult;

const rawServerErrorResult : MyFunc = (result) => {
    return serverErrorResult(result.errors,result.result);
}



export function serverErrorResult(errors:string[],result:any) : ProvisionResult {
    return {
        errorType : ErrorType.server,
        ok : false,
        errors:errors,
        result:result
    };
}

export function clientErrorResult(errors:string[], result:any) : ProvisionResult {
    return {
        errorType : ErrorType.client,
        ok : false,
        errors:errors,
        result:result
    };
}

export function okResult(result:any) : ProvisionResult {
    return {
        errorType : ErrorType.NoError,
        ok : true,
        errors:null,
        result:result
    };
}


async function renderOkJson(env : Env, request : D1Request, data) {
    let response = await renderJson(env,request,data);     
    return response;
}

async function renderInternalServorErrorJson(env : Env, request : D1Request, data: any) {
    return error(500,data);
}

async function renderBadRequestJson(env:Env, request:D1Request, data) {
    return error(400,data);
}

async function renderJson(env:Env, request:D1Request, data:any) {
    const payload = JSON.stringify(data);
    var response = new Response(payload);
    response.headers.set('Content-Type', 'application/json')
    return response
}

async function renderProvisioning(env:Env, request:D1Request, result:ProvisionResult) {
    if (result.ok) {
        console.log('return OK');
        return await renderOkJson(env,request,result.result);
    }
    else {
        switch(result.errorType) {
            case ErrorType.server : {
                console.log('return server ERROR');
                return await renderInternalServorErrorJson(env,request,result.result);
            }
            case ErrorType.client: {
                console.log('return client ERROR');
                return await renderBadRequestJson(env,request,result.result);
            }
            default: {
                console.log('return OK (2)');
                return await renderOkJson(env,request,result.result);
            }
        }
    }
    
}


async function CreateAndPopulateDatabase(env:Env, request:D1Request) : Promise<ProvisionResult> {

    let d1 = request.D1;

    const tenant = request.params.tenant
    try {        
        if (tenant) {            
            const d1Name = `D1_${tenant}`
            const db = await d1.createD1(d1Name)
            if (!db.ok) {
                return db;
            }
            const creation = `DROP TABLE IF EXISTS data;
            CREATE TABLE data (id INT PRIMARY KEY, value TEXT);
            INSERT INTO data VALUES (1,'first data')`;
            const sql = await d1.executeSQL(creation, db.result.uuid)
            if (!sql.ok) {
                return sql;
            }
            return okResult({
                db:db,
                sql:sql
            });            
        }
        return clientErrorResult(['no tenant name'],null);
    }
    catch(e) {
        serverErrorResult([`error while provisioning D1 for :>${tenant}}<`,e.message],null)
    }

    return undefined;
}


router.post<D1Request, CF>('/tobby/:tenant',withParams,withContent,withD1(), async(request: D1Request, env:Env) => {
    console.log('return /tobby');
    const tenant = request.params.tenant;
    console.log(`/tobby/${tenant} : start`)
    const payload = JSON.stringify({
        "ok":true
    });
    var response = new Response(payload);
    response.headers.set('Content-Type', 'application/json')
    console.log('return /tobby',);
    return response;
});

router.post<D1Request,CF>('/project/:tenant',withParams,withContent,withD1(), async(request:D1Request, env:Env) => {
    console.log('return /project');
    const tenant = request.params.tenant;
    console.log(`/project/${tenant} : start`)
    
    
    const dbResult = await CreateAndPopulateDatabase(env,request);    
    if (!dbResult.ok) {
        console.log(`/project/${tenant} : database creation failed`,dbResult.errors);
        return await renderProvisioning(env,request,dbResult);
    }
    
    
    // console.log(`/project/${tenant} : database creation succeeded`,dbResult.result);
    
    let d1 = request.D1;
    let p:D1Result<ProjectInfo> = await d1.createProject(tenant,dbResult.result as D1);

    const payload = JSON.stringify(p.result);
    var response = new Response(payload);
    response.headers.set('Content-Type', 'application/json')
    console.log('return /project',);
    return response;
    
    // if (!p.ok) {
    //     console.log(`/project/${tenant} : project creation failed`,p.errors)
    //     return await renderProvisioning(env,request,rawServerErrorResult(p));
    // }   
    // console.log(`/project/${tenant} : project creation succeeded`,p.result);
    // return await renderProvisioning(env,request,okResult(p));     
});


// provision and bind a D1 instance with given tenant name
// should be a POST !
router.post<D1Request, CF>('/d1/:tenant', withParams, withContent,withD1(), async (request:D1Request, env:Env) => {

    let d1 = request.D1;

    const tenant = request.params.tenant



    // try {        

        const c : ProvisionResult = await CreateAndPopulateDatabase(env,request);
        if (!c.ok) {
            return await renderProvisioning(env,request,c)
        }
        const d1Name = `D1_${tenant}`
        const db = c.result.db as D1;
        const sql = c.result.sql
        try {
        const bind = await d1.bindD1(db.uuid, d1Name.toUpperCase())
            if (!bind.ok) {
                return await renderProvisioning(env,request, rawServerErrorResult(bind));
            }
            return await renderProvisioning(env,request, okResult({
                "d1": db,
                "bind": bind,
                "sql": sql,                
            }));        
        } catch (e) {
            return await renderProvisioning(env,request,            
                serverErrorResult([`error while provisioning D1 for :>${tenant}}<`,e.message],null));
        }
        
    //     if (tenant) {            
    //         const d1Name = `D1_${tenant}`
    //         const db = await d1.createD1(d1Name)
    //         if (!db.ok) {
    //             return await renderProvisioning(env,request, rawServerErrorResult(db));
    //         }
    //         const creation = `DROP TABLE IF EXISTS data;
    //         CREATE TABLE data (id INT PRIMARY KEY, value TEXT);
    //         INSERT INTO data VALUES (1,'first data')`;
    //         const sql = await d1.executeSQL(creation, db.result.uuid)
    //         if (!sql.ok) {
    //             return await renderProvisioning(env,request, rawServerErrorResult(sql));                
    //         }
    //         const bind = await d1.bindD1(db.result.uuid, d1Name.toUpperCase())
    //         if (!bind.ok) {
    //             return await renderProvisioning(env,request, rawServerErrorResult(bind));
    //         }
    //         return await renderProvisioning(env,request, okResult({
    //             "d1": db,
    //             "bind": bind,
    //             "sql": sql,                
    //         }));
    //     }
    //     return await renderProvisioning(env, request, clientErrorResult(['no tenant name'],null));        
    // } catch (e) {
    //     return await renderProvisioning(env,request,            
    //         serverErrorResult([`error while provisioning D1 for :>${tenant}}<`,e.message],null));
    // }
})

// get all databases
router.get<D1Request, CF>('/d1', withParams, withD1(), async (request: D1Request, env: Env) => {

    const d1 : D1Client = request.D1;

    try {

        let project = await d1.getProject();
        if (!project.ok) {
            return await renderProvisioning(env,request,rawServerErrorResult(project));
        }
        let databases = await d1.getD1Databases();
        if (!databases.ok) {
            return await renderProvisioning(env,request,rawServerErrorResult(databases));
        }
        const bindings = project?.result?.deployment_configs?.production?.d1_databases;
        if (bindings) {
            var uuids = Object.values(bindings).map(x => x.id);                
            const bases = databases.result.filter(x => uuids.includes(x.uuid));        
            return await renderProvisioning(env,request,okResult(bases))
        }
        else {
            return await renderProvisioning(env,request,okResult([]));
        }
    } catch (e) {        
        return await renderProvisioning(env,request,
            serverErrorResult([`error while getting databases for ${request.projectName}`,e.message],null));            
    }
})

// delete a database
router.delete<D1Request, CF>('/d1/:tenant', withParams, withD1(), async (request, env) => {

    let d1 = request.D1;

    const tenant = request.params.tenant
    try {        
        console.log(`delete D1 for :>${tenant}<`)
        if (tenant) {
	        var r = await d1.unbindD1(tenant);
            if(!r.ok) {
                return await renderProvisioning(env,request,rawServerErrorResult(r));
            }
            const d1Uuid = `${tenant}`
            const deleted = await d1.deleteD1ByUuid(d1Uuid);
            if (!deleted.ok) {
                return await renderProvisioning(env,request,rawServerErrorResult(deleted));
            }
            return await renderProvisioning(env,request,okResult(deleted));        
        }
        return await renderProvisioning(env, request, clientErrorResult(['no tenant name' ],null))
    } catch (e) {

        return await renderProvisioning(env,request,
            serverErrorResult([`error while deleting D1 for >${tenant}}< in project >${request.projectName}<`,e.message],null)
            );        
    }
})

// get all data for the given tenant
router.get('/d1/:tenant', withParams, withD1(), async (request:D1Request, env:Env) => {
    const tenant:string = request.params.tenant   
    try {         
        var d1Fromcontext = env[tenant.toUpperCase()];    
        if (!d1Fromcontext) {
            return await renderProvisioning(env,request,clientErrorResult([`no bound D1 for ${tenant}`],null));
        }
        const { results } = await d1Fromcontext.prepare('SELECT * FROM data').all()
        return await renderProvisioning(env, request, okResult(results))
    } catch (e) {
        return await renderProvisioning(env, request, 
            serverErrorResult([`error while getting data for >${tenant}}< in project >${request.projectName}<`,e.message],null)
            );
    }
})

// add a data row for a given tenant
// should be a PUT
router.put('/d1/:tenant', withParams, withContent, withD1(), async (request:D1Request, env:Env) => {

    try {
        var tenant = request.params.tenant
        var data = await request.json()
        var d1Fromcontext = env[tenant.toUpperCase()]
        if (!d1Fromcontext) {
            return await renderProvisioning(env,request,clientErrorResult([`no bound D1 for ${tenant}`],null));
        }
        var x = await d1Fromcontext
            .prepare(
                'INSERT INTO data (id, value) VALUES (?1, ?2)'
            )
            .bind(data.id,data.data)
            .run();
        return await renderProvisioning(env,request,okResult(x));
    } catch (e) {
        return await renderProvisioning(env,request,
            serverErrorResult([`error while updating data for >${tenant}}< in project >${request.projectName}<`,e.message],null));            
    }
})

router.all('*', (request, env) => {
    console.log('assets handler')
    return env.ASSETS.fetch(request)
})

export default {
    async fetch(request, environment, context) {
        console.log('fetching',request);
        return await router.handle(request, environment, context)
    },
    async scheduled(controller, environment, context) {
        // await doATask();
    },
}
