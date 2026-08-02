# OpenAPI: search

<table fit-page-width="true" header-row="true">
	<tr color="gray_bg"><td>Method</td><td>Path</td><td>Summary</td><td>Auth</td></tr>
	<tr><td><span color="blue">GET</span></td><td>`/api/search`</td><td>Search</td><td>Bearer</td></tr>
	<tr><td><span color="blue">GET</span></td><td>`/api/search/recent`</td><td>Recent Searches</td><td>Bearer</td></tr>
</table>

## <span color="blue">GET</span> `/api/search` {toggle="true"}
	**Summary**: Search
	**Operation ID**: `search_api_search_get`
	**Auth**: Bearer
	### Parameters
	<table fit-page-width="true" header-row="true">
		<tr><td>Name</td><td>In</td><td>Required</td><td>Schema</td></tr>
		<tr><td>`q`</td><td>query</td><td>True</td><td>string</td></tr>
		<tr><td>`scope`</td><td>query</td><td>False</td><td>string</td></tr>
		<tr><td>`board_id`</td><td>query</td><td>False</td><td>{'anyOf': [{'type': 'integer'}, {'type': 'null'}], 'title': 'Board Id'}</td></tr>
		<tr><td>`page`</td><td>query</td><td>False</td><td>integer</td></tr>
		<tr><td>`size`</td><td>query</td><td>False</td><td>integer</td></tr>
	</table>
	### Responses
	<table fit-page-width="true" header-row="true">
		<tr><td>Status</td><td>Description</td><td>Schema</td></tr>
		<tr><td>`200`</td><td>Successful Response</td><td>application/json: None</td></tr>
		<tr><td>`422`</td><td>Validation Error</td><td>application/json: HTTPValidationError</td></tr>
	</table>

## <span color="blue">GET</span> `/api/search/recent` {toggle="true"}
	**Summary**: Recent Searches
	**Operation ID**: `recent_searches_api_search_recent_get`
	**Auth**: Bearer
	### Responses
	<table fit-page-width="true" header-row="true">
		<tr><td>Status</td><td>Description</td><td>Schema</td></tr>
		<tr><td>`200`</td><td>Successful Response</td><td>application/json: None</td></tr>
	</table>