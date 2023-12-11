<script>
	let name = 'world';

	let databases = [];

	let data = [];

	let newTenant = "";

	let dataid = "";

	let datavalue = "";

	let currentTenant;
	
	import {onMount} from 'svelte';

	onMount(async () => {
		console.log("mounting svelte app");
		const dbs = await getAllDatabases();
		console.log("databases are ::",dbs);
		databases = dbs;
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
		await fetch('d1/'+tenant, {method:'DELETE'});
		const dbs = await getAllDatabases();
		console.log("databases are ::",dbs);
		databases = dbs;
	}

	const selectDb = async (tenant) => {        
		currentTenant = tenant;
		await fetch('d1/'+tenant);
	}

	const createDb = async () => {				
		await fetch('d1/'+newTenant,{method:'POST'});
		const dbs = await getAllDatabases();
		console.log("databases are ::",dbs);
		databases = dbs;
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

<h2>Manage databases</h2> 
    <table>
		{#each databases as database}    
			<tr><td>{database.uuid}</td><td>{database.name}</td>        
				<td><span style="cursor:pointer; " on:click={()  => {selectDb(database.uuid)}} on:keydown={()  => {selectDb(database.uuid)}} role="button" tabindex="0">Select</span></td>
				<td><span style="cursor: pointer;" on:click={() => {deleteDb(database.uuid)}} on:keydown={()  => {deleteDb(database.uuid)}} role="button" tabindex="0">Delete</span></td></tr>
		{/each}
	</table>

	<label for="newtenant">tenant</label>
	<input id="newtenant" name="tenant" type="text" bind:value={newTenant} on:change={createDb}/>


</div>