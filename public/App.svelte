<script>
	let name = 'world';

	let databases = [];

	let data = [];

	let newTenant = "";

	let dataid = "";

	let datavalue = "";

	let currentTenant;

	let dataId;

	let dataValue;
	
	let loading = false;

	import {onMount} from 'svelte';

	onMount(async () => {
		loading = true;
		console.log("mounting svelte app");
		const dbs = await getAllDatabases();
		console.log("databases are ::",dbs);
		databases = dbs;
		loading = false;
	});

	const getAllDatabases = async () => {
    	var response = await fetch('d1/');
		console.log("response",response);
		// const content = await response.text();
		// const d = JSON.parse(content);
		// console.log("D",d);
		const bases = await response.json();
		console.log("data",bases);
		return bases;
	}

	const deleteDb = async (tenant) => {    
		loading = true;
		await fetch('d1/'+tenant, {method:'DELETE'});
		const dbs = await getAllDatabases();
		console.log("databases are ::",dbs);
		databases = dbs;
		loading = false;
	}

	const selectDb = async (tenant) => { 
	console.log("selecting tenant",tenant);
		loading = true;
		currentTenant = tenant;
		console.log(`fetching d1/${tenant.name}`);
		let response = await fetch('d1/'+tenant.name);
		console.log(response);
		if (response.status == 200) {
		   var payload = await response.text();
		   console.log(payload);
		   var dat = JSON.parse(payload);
		   console.log(dat);
		   data = dat;		   
		}
		loading = false;
		console.log('db selected');
	}

	const createDb = async () => {				
		loading = true;
		await fetch('d1/'+newTenant,{method:'POST'});
		const dbs = await getAllDatabases();
		console.log("databases are ::",dbs);
		databases = dbs;
		loading = false;
	}


	const addData = async () => {
		loading = true;
		const payload = {
			"id":dataId,
			"data":dataValue
		};
		await fetch('d1/'+currentTenant.name,{method:"PUT", body:JSON.stringify(payload)});
		dataId="";
		dataValue="";
		await selectDb(currentTenant);
		loading = false;
	}


</script>

<div>

<img src="loading.gif" style="display:{loading ? "block":"none"}" alt="loading"/>

<h2>Manage databases</h2> 
<h3>databases</h3>
    <table>
		{#each databases as database}    
			<tr><td>{database.uuid}</td><td>{database.name}</td>        
				<td><input type="button"  on:click={()  => {selectDb(database)}} on:keydown={()  => {selectDb(database)}}  tabindex="0" value="Select"/></td>
				<td><input type="button"  on:click={() => {deleteDb(database.uuid)}} on:keydown={()  => {deleteDb(database.uuid)}}  tabindex="0" value="Delete"/></td></tr>
		{/each}
	</table>
<h3>create a database</h3>
	<label for="newtenant">tenant</label>
	<input id="newtenant" name="tenant" type="text" bind:value={newTenant} on:change={createDb}/>

<input id="new" name="new" type="button" value="New" on:click={createDb}/>
{#if currentTenant !== null && currentTenant !== undefined}
	<h2>Manage data</h2>

	<h3>Data</h3>
	<table>
		{#each data as row}    
			<tr><td>{row.id}</td><td>{row.value}</td>        			
		{/each}
	</table>
	<h3>add a data row</h3>
		<label for="dataId">Id</label>
		<input id="dataId" name="dataId" type="text" bind:value={dataId}/>

		<label for="dataValue">Value</label>
		<input id="dataValue" name="dataValue" type="text" bind:value={dataValue}/>

		<input type="button" on:click={addData} value="Add"/>
{/if}
</div>