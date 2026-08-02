# OpenAPI: media

<table fit-page-width="true" header-row="true">
	<tr color="gray_bg"><td>Method</td><td>Path</td><td>Summary</td><td>Auth</td></tr>
	<tr><td><span color="green">POST</span></td><td>`/api/media/uploads`</td><td>Upload Media</td><td>Bearer</td></tr>
	<tr><td><span color="blue">GET</span></td><td>`/api/media/{media_id}`</td><td>Get Media</td><td>guest/optional</td></tr>
</table>

## <span color="green">POST</span> `/api/media/uploads` {toggle="true"}
	**Summary**: Upload Media
	**Operation ID**: `upload_media_api_media_uploads_post`
	**Auth**: Bearer
	### Request Body
	`multipart/form-data: Body_upload_media_api_media_uploads_post`
	### Responses
	<table fit-page-width="true" header-row="true">
		<tr><td>Status</td><td>Description</td><td>Schema</td></tr>
		<tr><td>`200`</td><td>Successful Response</td><td>application/json: None</td></tr>
		<tr><td>`422`</td><td>Validation Error</td><td>application/json: HTTPValidationError</td></tr>
	</table>

## <span color="blue">GET</span> `/api/media/{media_id}` {toggle="true"}
	**Summary**: Get Media
	**Operation ID**: `get_media_api_media__media_id__get`
	**Auth**: guest/optional
	### Parameters
	<table fit-page-width="true" header-row="true">
		<tr><td>Name</td><td>In</td><td>Required</td><td>Schema</td></tr>
		<tr><td>`media_id`</td><td>path</td><td>True</td><td>integer</td></tr>
	</table>
	### Responses
	<table fit-page-width="true" header-row="true">
		<tr><td>Status</td><td>Description</td><td>Schema</td></tr>
		<tr><td>`200`</td><td>Successful Response</td><td>application/json: None</td></tr>
		<tr><td>`422`</td><td>Validation Error</td><td>application/json: HTTPValidationError</td></tr>
	</table>