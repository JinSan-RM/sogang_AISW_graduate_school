# OpenAPI: comments

<table fit-page-width="true" header-row="true">
	<tr color="gray_bg"><td>Method</td><td>Path</td><td>Summary</td><td>Auth</td></tr>
	<tr><td><span color="blue">GET</span></td><td>`/api/posts/{post_id}/comments`</td><td>Get Comments</td><td>guest/optional</td></tr>
	<tr><td><span color="green">POST</span></td><td>`/api/posts/{post_id}/comments`</td><td>Create Comment</td><td>Bearer</td></tr>
	<tr><td><span color="orange">PUT</span></td><td>`/api/comments/{comment_id}`</td><td>Update Comment</td><td>Bearer</td></tr>
	<tr><td><span color="red">DELETE</span></td><td>`/api/comments/{comment_id}`</td><td>Delete Comment</td><td>Bearer</td></tr>
</table>

## <span color="blue">GET</span> `/api/posts/{post_id}/comments` {toggle="true"}
	**Summary**: Get Comments
	**Operation ID**: `get_comments_api_posts__post_id__comments_get`
	**Auth**: guest/optional
	### Parameters
	<table fit-page-width="true" header-row="true">
		<tr><td>Name</td><td>In</td><td>Required</td><td>Schema</td></tr>
		<tr><td>`post_id`</td><td>path</td><td>True</td><td>integer</td></tr>
	</table>
	### Responses
	<table fit-page-width="true" header-row="true">
		<tr><td>Status</td><td>Description</td><td>Schema</td></tr>
		<tr><td>`200`</td><td>Successful Response</td><td>application/json: None</td></tr>
		<tr><td>`422`</td><td>Validation Error</td><td>application/json: HTTPValidationError</td></tr>
	</table>

## <span color="green">POST</span> `/api/posts/{post_id}/comments` {toggle="true"}
	**Summary**: Create Comment
	**Operation ID**: `create_comment_api_posts__post_id__comments_post`
	**Auth**: Bearer
	### Parameters
	<table fit-page-width="true" header-row="true">
		<tr><td>Name</td><td>In</td><td>Required</td><td>Schema</td></tr>
		<tr><td>`post_id`</td><td>path</td><td>True</td><td>integer</td></tr>
	</table>
	### Request Body
	`application/json: CommentCreate`
	### Responses
	<table fit-page-width="true" header-row="true">
		<tr><td>Status</td><td>Description</td><td>Schema</td></tr>
		<tr><td>`200`</td><td>Successful Response</td><td>application/json: None</td></tr>
		<tr><td>`422`</td><td>Validation Error</td><td>application/json: HTTPValidationError</td></tr>
	</table>

## <span color="orange">PUT</span> `/api/comments/{comment_id}` {toggle="true"}
	**Summary**: Update Comment
	**Operation ID**: `update_comment_api_comments__comment_id__put`
	**Auth**: Bearer
	### Parameters
	<table fit-page-width="true" header-row="true">
		<tr><td>Name</td><td>In</td><td>Required</td><td>Schema</td></tr>
		<tr><td>`comment_id`</td><td>path</td><td>True</td><td>integer</td></tr>
	</table>
	### Request Body
	`application/json: CommentUpdate`
	### Responses
	<table fit-page-width="true" header-row="true">
		<tr><td>Status</td><td>Description</td><td>Schema</td></tr>
		<tr><td>`200`</td><td>Successful Response</td><td>application/json: None</td></tr>
		<tr><td>`422`</td><td>Validation Error</td><td>application/json: HTTPValidationError</td></tr>
	</table>

## <span color="red">DELETE</span> `/api/comments/{comment_id}` {toggle="true"}
	**Summary**: Delete Comment
	**Operation ID**: `delete_comment_api_comments__comment_id__delete`
	**Auth**: Bearer
	### Parameters
	<table fit-page-width="true" header-row="true">
		<tr><td>Name</td><td>In</td><td>Required</td><td>Schema</td></tr>
		<tr><td>`comment_id`</td><td>path</td><td>True</td><td>integer</td></tr>
	</table>
	### Responses
	<table fit-page-width="true" header-row="true">
		<tr><td>Status</td><td>Description</td><td>Schema</td></tr>
		<tr><td>`200`</td><td>Successful Response</td><td>application/json: None</td></tr>
		<tr><td>`422`</td><td>Validation Error</td><td>application/json: HTTPValidationError</td></tr>
	</table>