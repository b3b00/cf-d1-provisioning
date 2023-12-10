const CF_API_URL = 'https://api.cloudflare.com/client/v4'

///accounts/${accountId}/d1/database/${dbUuid}/query
async function request(uri, key, method, body) {
    var root = uri.startsWith('/') ? CF_API_URL : CF_API_URL + '/'
    console.log(`${method}(${uri},${key})`)
    console.log(body)

    var options = {
        method: method,
        headers: {
            Authorization: `Bearer ${key}`,
        },
 //       mode: 'cors',
   //     cache: 'default',
    }
    if (body) {
        options.body = JSON.stringify(body)
    }

    console.log(`options ${options}`, options)

    console.log('sending....'+root+uri)
    try {
	var r = await fetch(root + uri, options)
	console.log('d1 fetched '+r.status);
    if (r.status == 200) {
        console.log('OK')
        var content = await r.text();
        var d1 = JSON.parse(content);
        //var d1 = await r.json()
        console.log(d1)
        return d1
    } else {
        const content = await r.text();
        console.log(`error >${r.status}< :>${r.statusText}< ::>${content}<`);
        return null
    }
    }
    catch(e) {
	console.log('exception when requesting CF');
	console.log(e);
	return null;
    }
}

async function post(uri, key, body) {
    console.log(`POST >${uri}< >${key}<`,body)
    return await request(uri, key, 'POST', body)
}

async function patch(uri, key, body) {
    return await request(uri, key, 'PATCH', body)
}

async function get(uri, key) {
    return await request(uri, key, 'GET', undefined)
}

async function del(uri, key) {
    return await request(uri, key, 'DELETE' , undefined);
}

async function GetProjectId(context, projectName) {
    var projectInfo = await get(
        `/accounts/${context.env.ACCOUNT_ID}/pages/projects/${projectName}`,
        context.env.API_KEY
    )
    console.log('getProjectId get :', projectInfo)

    if (projectInfo) {
        return projectInfo.result.id
    }
    return null
}

export async function getD1Databases(env) {
    const list = await get(`/accounts/${env.ACCOUNT_ID}/d1/database`,env.API_KEY);
    console.log(list);
    return list;
}

export async function getD1Database(env, name) {
    const databases = await getD1Databases();
    const d1 = databases.filter(x => x.name == name).first();
    return d1;
}

export async function deleteD1(env, dbName) {
    try {
	var d1 = await getD1Database(dbName);
	if (d1) {
	    const uri = `/accounts/${env.ACCOUNT_ID}/d1/database/${db1.uuid}`;
    console.log(`deleteD1(${dbName}) : ${uri}`);
    console.log(payLoad)
    var d1 = await del(
        uri,
        env.API_KEY,
        payLoad
    )
    console.log('D1.js :: d1 deleted')
    console.log(d1)
    console.log('---------------------------------')
	    return d1;
	}
    else {
	console.log(`D1 ${dbName} not found`);
    }
    }
    catch(e) {
	console.log('error while deleting'+dbName,e);
    }
    
}

export async function createD1(env, dbName) {
    var payLoad = {
        name: dbName,
    }
    const uri = `/accounts/${env.ACCOUNT_ID}/d1/database`;
    console.log(`D1.js :: CreateD1(${dbName}) : ${uri}`);
    console.log(payLoad)
    var d1 = await post(
        uri,
        env.API_KEY,
        payLoad
    )
    console.log('D1.js :: d1 created')
    console.log(d1)
    console.log('---------------------------------')
    return d1
}

export async function executeSQL(env, sql, d1Id) {
    try {
	console.log(`D1.js :: d1.executeSQL(${sql},${d1Id})`);
    var uri = `/accounts/${env.ACCOUNT_ID}/d1/database/${d1Id}/query`
	console.log(`D1.js ::  => ${uri}`);
	var result = await post(uri, env.API_KEY, { "sql": sql })
	return result
    }
    catch(e) {
	console.log("D1.js :: error while executing SQL ",sql);
	console.log(e);
    }
}

export async function bindD1(env, d1Id, projectName) {
console.log("bon donc project "+projectName+" to d1 "+d1Id)
    var payload = {
        deployment_configs: {
            production: {
                d1_databases: {
                    D1_BINDING: {
                        id: d1Id
                    },
                },
            },
        }        
    }

    var uri=`/accounts/${env.ACCOUNT_ID}/pages/projects/${projectName}`;
console.log(`PATCH ${uri}`,payload)
    return await patch(uri,env.API_KEY,payload);
}

export async function onRequest(context) {
    var params = context.params.d1
    var appName = params[0]
    var d1Name = null
    if (params.length >= 1) {
        d1Name = params[1]
        console.log(`D1 name :[[${d1Name}]]`)
    }
    console.log('*************************************')
    var projectId = await GetProjectId(context, appName)
    console.log('******** => projectId :: ' + projectId + ' ****************')
    console.log('*************************************')
    let accountId = context.env.API_KEY
    var r = {
        accountId: accountId,
        d1Name: d1Name,
        appName: appName,
        projectId: projectId,
    }
    console.log('*************************************')
    console.log('*************************************')
    console.log(r)
    console.log('*************************************')
    console.log('*************************************')

    var d1 = {}
    var sql = {}
    var bind = {}
    if (d1Name) {
        console.log('*************************************')
    console.log('*************************************')
        console.log(`CREATE D1 database >${d1Name}<`)
        d1 = await CreateD1(context, d1Name)
        var creation = `drop table if exists datas;
        create table data (id  TEXT, data TEXT);`
        sql = await ExecuteSQL(context, creation, d1.result.uuid)
        bind = await BindD1(context, d1.result.uuid, appName)

        console.log('*************************************')
        console.log('*************************************')
console.log(context.env);

        console.log('*************************************')
    console.log('*************************************')
        var d1Fromcontext = context.env[d1Name]        
        console.log("d1Fromcontext",d1Fromcontext);
        await d1Fromcontext.prepare(
            'INSERT INTO calendars (groupe,team, type, calendar) VALUES (?1, ?2, ?3, ?4)'
        )
                .bind('group', 'team', 42, 'ics')
                .run()
    } else {
        console.log(`DO NOT CREATE D1 database >${d1Name}<`)
    }

    var res = {
        meta: r,
        d1: d1,
        sql: sql,
    }

    let response = new Response(JSON.stringify(res))
    response.headers.set('Content-Type', 'text/pplain')
    return response
}
