# OpenAPI: boards

<table fit-page-width="true" header-row="true">
	<tr color="gray_bg"><td>Method</td><td>Path</td><td>Summary</td><td>Auth</td></tr>
	<tr><td><span color="blue">GET</span></td><td>`/api/boards`</td><td>Get Boards</td><td>guest/optional</td></tr>
	<tr><td><span color="blue">GET</span></td><td>`/api/boards/{board_id}`</td><td>Get Board Detail</td><td>guest/optional</td></tr>
</table>

## <span color="blue">GET</span> `/api/boards` {toggle="true"}
	**Summary**: Get Boards
	**Operation ID**: `get_boards_api_boards_get`
	**Auth**: guest/optional
	### Responses
	<table fit-page-width="true" header-row="true">
		<tr><td>Status</td><td>Description</td><td>Schema</td></tr>
		<tr><td>`200`</td><td>Successful Response</td><td>application/json: None</td></tr>
	</table>

## <span color="blue">GET</span> `/api/boards/{board_id}` {toggle="true"}
	**Summary**: Get Board Detail
	**Operation ID**: `get_board_detail_api_boards__board_id__get`
	**Auth**: guest/optional
	### Parameters
	<table fit-page-width="true" header-row="true">
		<tr><td>Name</td><td>In</td><td>Required</td><td>Schema</td></tr>
		<tr><td>`board_id`</td><td>path</td><td>True</td><td>integer</td></tr>
	</table>
	### Responses
	<table fit-page-width="true" header-row="true">
		<tr><td>Status</td><td>Description</td><td>Schema</td></tr>
		<tr><td>`200`</td><td>Successful Response</td><td>application/json: None</td></tr>
		<tr><td>`422`</td><td>Validation Error</td><td>application/json: HTTPValidationError</td></tr>
	</table>