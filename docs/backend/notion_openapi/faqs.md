# OpenAPI: faqs

<table fit-page-width="true" header-row="true">
	<tr color="gray_bg"><td>Method</td><td>Path</td><td>Summary</td><td>Auth</td></tr>
	<tr><td><span color="blue">GET</span></td><td>`/api/faqs`</td><td>Get Faqs</td><td>guest/optional</td></tr>
	<tr><td><span color="green">POST</span></td><td>`/api/faqs`</td><td>Create Faq</td><td>Bearer</td></tr>
	<tr><td><span color="orange">PUT</span></td><td>`/api/faqs/{faq_id}`</td><td>Update Faq</td><td>Bearer</td></tr>
	<tr><td><span color="red">DELETE</span></td><td>`/api/faqs/{faq_id}`</td><td>Delete Faq</td><td>Bearer</td></tr>
</table>

## <span color="blue">GET</span> `/api/faqs` {toggle="true"}
	**Summary**: Get Faqs
	**Operation ID**: `get_faqs_api_faqs_get`
	**Auth**: guest/optional
	### Parameters
	<table fit-page-width="true" header-row="true">
		<tr><td>Name</td><td>In</td><td>Required</td><td>Schema</td></tr>
		<tr><td>`category`</td><td>query</td><td>False</td><td>{'anyOf': [{'type': 'string'}, {'type': 'null'}], 'title': 'Category'}</td></tr>
		<tr><td>`include_inactive`</td><td>query</td><td>False</td><td>boolean</td></tr>
	</table>
	### Responses
	<table fit-page-width="true" header-row="true">
		<tr><td>Status</td><td>Description</td><td>Schema</td></tr>
		<tr><td>`200`</td><td>Successful Response</td><td>application/json: None</td></tr>
		<tr><td>`422`</td><td>Validation Error</td><td>application/json: HTTPValidationError</td></tr>
	</table>

## <span color="green">POST</span> `/api/faqs` {toggle="true"}
	**Summary**: Create Faq
	**Operation ID**: `create_faq_api_faqs_post`
	**Auth**: Bearer
	### Request Body
	`application/json: FAQCreate`
	### Responses
	<table fit-page-width="true" header-row="true">
		<tr><td>Status</td><td>Description</td><td>Schema</td></tr>
		<tr><td>`200`</td><td>Successful Response</td><td>application/json: None</td></tr>
		<tr><td>`422`</td><td>Validation Error</td><td>application/json: HTTPValidationError</td></tr>
	</table>

## <span color="orange">PUT</span> `/api/faqs/{faq_id}` {toggle="true"}
	**Summary**: Update Faq
	**Operation ID**: `update_faq_api_faqs__faq_id__put`
	**Auth**: Bearer
	### Parameters
	<table fit-page-width="true" header-row="true">
		<tr><td>Name</td><td>In</td><td>Required</td><td>Schema</td></tr>
		<tr><td>`faq_id`</td><td>path</td><td>True</td><td>integer</td></tr>
	</table>
	### Request Body
	`application/json: FAQUpdate`
	### Responses
	<table fit-page-width="true" header-row="true">
		<tr><td>Status</td><td>Description</td><td>Schema</td></tr>
		<tr><td>`200`</td><td>Successful Response</td><td>application/json: None</td></tr>
		<tr><td>`422`</td><td>Validation Error</td><td>application/json: HTTPValidationError</td></tr>
	</table>

## <span color="red">DELETE</span> `/api/faqs/{faq_id}` {toggle="true"}
	**Summary**: Delete Faq
	**Operation ID**: `delete_faq_api_faqs__faq_id__delete`
	**Auth**: Bearer
	### Parameters
	<table fit-page-width="true" header-row="true">
		<tr><td>Name</td><td>In</td><td>Required</td><td>Schema</td></tr>
		<tr><td>`faq_id`</td><td>path</td><td>True</td><td>integer</td></tr>
	</table>
	### Responses
	<table fit-page-width="true" header-row="true">
		<tr><td>Status</td><td>Description</td><td>Schema</td></tr>
		<tr><td>`200`</td><td>Successful Response</td><td>application/json: None</td></tr>
		<tr><td>`422`</td><td>Validation Error</td><td>application/json: HTTPValidationError</td></tr>
	</table>