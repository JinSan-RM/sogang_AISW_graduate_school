# OpenAPI: events

<table fit-page-width="true" header-row="true">
	<tr color="gray_bg"><td>Method</td><td>Path</td><td>Summary</td><td>Auth</td></tr>
	<tr><td><span color="blue">GET</span></td><td>`/api/events`</td><td>Get Events</td><td>guest/optional</td></tr>
	<tr><td><span color="green">POST</span></td><td>`/api/events`</td><td>Create Event</td><td>Bearer</td></tr>
	<tr><td><span color="orange">PUT</span></td><td>`/api/events/{event_id}`</td><td>Update Event</td><td>Bearer</td></tr>
	<tr><td><span color="red">DELETE</span></td><td>`/api/events/{event_id}`</td><td>Delete Event</td><td>Bearer</td></tr>
</table>

## <span color="blue">GET</span> `/api/events` {toggle="true"}
	**Summary**: Get Events
	**Operation ID**: `get_events_api_events_get`
	**Auth**: guest/optional
	### Parameters
	<table fit-page-width="true" header-row="true">
		<tr><td>Name</td><td>In</td><td>Required</td><td>Schema</td></tr>
		<tr><td>`from_date`</td><td>query</td><td>False</td><td>{'anyOf': [{'type': 'string', 'format': 'date-time'}, {'type': 'null'}], 'title': 'From Date'}</td></tr>
		<tr><td>`to_date`</td><td>query</td><td>False</td><td>{'anyOf': [{'type': 'string', 'format': 'date-time'}, {'type': 'null'}], 'title': 'To Date'}</td></tr>
		<tr><td>`category`</td><td>query</td><td>False</td><td>{'anyOf': [{'type': 'string'}, {'type': 'null'}], 'title': 'Category'}</td></tr>
	</table>
	### Responses
	<table fit-page-width="true" header-row="true">
		<tr><td>Status</td><td>Description</td><td>Schema</td></tr>
		<tr><td>`200`</td><td>Successful Response</td><td>application/json: None</td></tr>
		<tr><td>`422`</td><td>Validation Error</td><td>application/json: HTTPValidationError</td></tr>
	</table>

## <span color="green">POST</span> `/api/events` {toggle="true"}
	**Summary**: Create Event
	**Operation ID**: `create_event_api_events_post`
	**Auth**: Bearer
	### Request Body
	`application/json: EventCreate`
	### Responses
	<table fit-page-width="true" header-row="true">
		<tr><td>Status</td><td>Description</td><td>Schema</td></tr>
		<tr><td>`200`</td><td>Successful Response</td><td>application/json: None</td></tr>
		<tr><td>`422`</td><td>Validation Error</td><td>application/json: HTTPValidationError</td></tr>
	</table>

## <span color="orange">PUT</span> `/api/events/{event_id}` {toggle="true"}
	**Summary**: Update Event
	**Operation ID**: `update_event_api_events__event_id__put`
	**Auth**: Bearer
	### Parameters
	<table fit-page-width="true" header-row="true">
		<tr><td>Name</td><td>In</td><td>Required</td><td>Schema</td></tr>
		<tr><td>`event_id`</td><td>path</td><td>True</td><td>integer</td></tr>
	</table>
	### Request Body
	`application/json: EventUpdate`
	### Responses
	<table fit-page-width="true" header-row="true">
		<tr><td>Status</td><td>Description</td><td>Schema</td></tr>
		<tr><td>`200`</td><td>Successful Response</td><td>application/json: None</td></tr>
		<tr><td>`422`</td><td>Validation Error</td><td>application/json: HTTPValidationError</td></tr>
	</table>

## <span color="red">DELETE</span> `/api/events/{event_id}` {toggle="true"}
	**Summary**: Delete Event
	**Operation ID**: `delete_event_api_events__event_id__delete`
	**Auth**: Bearer
	### Parameters
	<table fit-page-width="true" header-row="true">
		<tr><td>Name</td><td>In</td><td>Required</td><td>Schema</td></tr>
		<tr><td>`event_id`</td><td>path</td><td>True</td><td>integer</td></tr>
	</table>
	### Responses
	<table fit-page-width="true" header-row="true">
		<tr><td>Status</td><td>Description</td><td>Schema</td></tr>
		<tr><td>`200`</td><td>Successful Response</td><td>application/json: None</td></tr>
		<tr><td>`422`</td><td>Validation Error</td><td>application/json: HTTPValidationError</td></tr>
	</table>