# OpenAPI: reports

<table fit-page-width="true" header-row="true">
	<tr color="gray_bg"><td>Method</td><td>Path</td><td>Summary</td><td>Auth</td></tr>
	<tr><td><span color="green">POST</span></td><td>`/api/posts/{post_id}/report`</td><td>Report Post</td><td>Bearer</td></tr>
	<tr><td><span color="green">POST</span></td><td>`/api/comments/{comment_id}/report`</td><td>Report Comment</td><td>Bearer</td></tr>
</table>

## <span color="green">POST</span> `/api/posts/{post_id}/report` {toggle="true"}
	**Summary**: Report Post
	**Operation ID**: `report_post_api_posts__post_id__report_post`
	**Auth**: Bearer
	### Parameters
	<table fit-page-width="true" header-row="true">
		<tr><td>Name</td><td>In</td><td>Required</td><td>Schema</td></tr>
		<tr><td>`post_id`</td><td>path</td><td>True</td><td>integer</td></tr>
	</table>
	### Request Body
	`application/json: ReportCreate`
	### Responses
	<table fit-page-width="true" header-row="true">
		<tr><td>Status</td><td>Description</td><td>Schema</td></tr>
		<tr><td>`200`</td><td>Successful Response</td><td>application/json: None</td></tr>
		<tr><td>`422`</td><td>Validation Error</td><td>application/json: HTTPValidationError</td></tr>
	</table>

## <span color="green">POST</span> `/api/comments/{comment_id}/report` {toggle="true"}
	**Summary**: Report Comment
	**Operation ID**: `report_comment_api_comments__comment_id__report_post`
	**Auth**: Bearer
	### Parameters
	<table fit-page-width="true" header-row="true">
		<tr><td>Name</td><td>In</td><td>Required</td><td>Schema</td></tr>
		<tr><td>`comment_id`</td><td>path</td><td>True</td><td>integer</td></tr>
	</table>
	### Request Body
	`application/json: ReportCreate`
	### Responses
	<table fit-page-width="true" header-row="true">
		<tr><td>Status</td><td>Description</td><td>Schema</td></tr>
		<tr><td>`200`</td><td>Successful Response</td><td>application/json: None</td></tr>
		<tr><td>`422`</td><td>Validation Error</td><td>application/json: HTTPValidationError</td></tr>
	</table>