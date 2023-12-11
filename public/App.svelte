<script lang="javascript">



import {onMount} from 'svelte';

export let name = ""; 
console.log('building App.svelte');
onMount(async () => {
    console.log("mounting svelte app");
    const dbs = await getAllDatabases();
    console.log("databases are ::",dbs);
    databases = dbs;
});

let databases = [];

let data = [];

let newTenant = "";

let dataid = "";

let datavalue = "";

let currentTenant;

const create = async () => {
    var tenantField = document.getElementById('newtenant');
    var tenant = tenantField.value;
    await fetch('d1/'+tenant,{method:'POST'});
}

const del = async (tenant) => {    
    await fetch('d1/'+tenant, {method:'DELETE'});
}

const get = async (tenant) => {        
    currentTenant = tenant;
    await fetch('d1/'+tenant);
}

const getAllDatabases = async () => {
    var databases = await fetch('d1/');
}


const addData = async () => {
    const payload = {
        "id":dataid,
        "data":datavalue
    };
    await fetch('d1/'+tenant,{method:"POST", body:JSON.stringify(payload)});
    dataid="";
    datavalue="";
}


</script>

<div>
    <h1>{name}</h1>
    <table>
{#each databases as database}    
    <tr><td>{database.uuid}</td><td>{database.name}</td>        
        <td><span style="cursor:pointer; " on:click={()  => {get(database.name)}} on:keydown={()  => {get(database.name)}} role="button" tabindex="0">Select</span></td>
        <td><span style="cursor: pointer;" on:click={() => del(database.uuid)} on:keydown={()  => {del(database.name)}} role="button" tabindex="0">Delete</span></td></tr>
{/each}

<h2>Manage databases</h2> 
<label for="newtenant">tenant</label>
<input id="newtenant" name="tenant" type="text" bind:value={newTenant} on:change={create}/>
</table>

<h2>data</h2>
<table>
{#each data as row}
<tr><td>{row.id}</td><td>{row.data}</td></tr>    
{/each}    

</table>

<input type="text" bind:value={dataid}/>
<input type="text" bind:value={datavalue}/>
<input type="button" on:click={addData}/>

</div>