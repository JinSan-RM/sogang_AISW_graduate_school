# OpenAPI: posts

<table fit-page-width="true" header-row="true">
	<tr color="gray_bg"><td>Method</td><td>Path</td><td>Summary</td><td>Auth</td></tr>
	<tr><td><span color="blue">GET</span></td><td>`/api/boards/{board_id}/posts`</td><td>Get Posts</td><td>guest/optional</td></tr>
	<tr><td><span color="green">POST</span></td><td>`/api/boards/{board_id}/posts`</td><td>Create Post</td><td>Bearer</td></tr>
	<tr><td><span color="blue">GET</span></td><td>`/api/posts/{post_id}`</td><td>Get Post Detail</td><td>Bearer</td></tr>
	<tr><td><span color="orange">PUT</span></td><td>`/api/posts/{post_id}`</td><td>Update Post</td><td>Bearer</td></tr>
	<tr><td><span color="red">DELETE</span></td><td>`/api/posts/{post_id}`</td><td>Delete Post</td><td>Bearer</td></tr>
	<tr><td><span color="orange">PUT</span></td><td>`/api/posts/{post_id}/pin`</td><td>Set Post Pin</td><td>Bearer</td></tr>
	<tr><td><span color="green">POST</span></td><td>`/api/posts/{post_id}/like`</td><td>Toggle Like</td><td>Bearer</td></tr>
	<tr><td><span color="green">POST</span></td><td>`/api/posts/{post_id}/bookmark`</td><td>Toggle Bookmark</td><td>Bearer</td></tr>
	<tr><td><span color="orange">PUT</span></td><td>`/api/posts/{post_id}/suggestion`</td><td>Update Suggestion</td><td>Bearer</td></tr>
</table>

## <span color="blue">GET</span> `/api/boards/{board_id}/posts` {toggle="true"}
	**Summary**: Get Posts
	**Operation ID**: `get_posts_api_boards__board_id__posts_get`
	**Auth**: guest/optional
	### Parameters
	<table fit-page-width="true" header-row="true">
		<tr><td>Name</td><td>In</td><td>Required</td><td>Schema</td></tr>
		<tr><td>`board_id`</td><td>path</td><td>True</td><td>integer</td></tr>
		<tr><td>`page`</td><td>query</td><td>False</td><td>integer</td></tr>
		<tr><td>`size`</td><td>query</td><td>False</td><td>integer</td></tr>
		<tr><td>`q`</td><td>query</td><td>False</td><td>{'anyOf': [{'type': 'string', 'minLength': 1}, {'type': 'null'}], 'title': 'Q'}</td></tr>
		<tr><td>`category`</td><td>query</td><td>False</td><td>{'anyOf': [{'type': 'string'}, {'type': 'null'}], 'title': 'Category'}</td></tr>
		<tr><td>`status`</td><td>query</td><td>False</td><td>{'anyOf': [{'type': 'string'}, {'type': 'null'}], 'title': 'Status'}</td></tr>
		<tr><td>`sort`</td><td>query</td><td>False</td><td>string</td></tr>
	</table>
	### Responses
	<table fit-page-width="true" header-row="true">
		<tr><td>Status</td><td>Description</td><td>Schema</td></tr>
		<tr><td>`200`</td><td>Successful Response</td><td>application/json: None</td></tr>
		<tr><td>`422`</td><td>Validation Error</td><td>application/json: HTTPValidationError</td></tr>
	</table>

## <span color="green">POST</span> `/api/boards/{board_id}/posts` {toggle="true"}
	**Summary**: Create Post
	**Operation ID**: `create_post_api_boards__board_id__posts_post`
	**Auth**: Bearer
	### Parameters
	<table fit-page-width="true" header-row="true">
		<tr><td>Name</td><td>In</td><td>Required</td><td>Schema</td></tr>
		<tr><td>`board_id`</td><td>path</td><td>True</td><td>integer</td></tr>
	</table>
	### Request Body
	`application/json: PostCreate`
	### Responses
	<table fit-page-width="true" header-row="true">
		<tr><td>Status</td><td>Description</td><td>Schema</td></tr>
		<tr><td>`200`</td><td>Successful Response</td><td>application/json: None</td></tr>
		<tr><td>`422`</td><td>Validation Error</td><td>application/json: HTTPValidationError</td></tr>
	</table>

## <span color="blue">GET</span> `/api/posts/{post_id}` {toggle="true"}
	**Summary**: Get Post Detail
	**Operation ID**: `get_post_detail_api_posts__post_id__get`
	**Auth**: Bearer
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

## <span color="orange">PUT</span> `/api/posts/{post_id}` {toggle="true"}
	**Summary**: Update Post
	**Operation ID**: `update_post_api_posts__post_id__put`
	**Auth**: Bearer
	### Parameters
	<table fit-page-width="true" header-row="true">
		<tr><td>Name</td><td>In</td><td>Required</td><td>Schema</td></tr>
		<tr><td>`post_id`</td><td>path</td><td>True</td><td>integer</td></tr>
	</table>
	### Request Body
	`application/json: PostUpdate`
	### Responses
	<table fit-page-width="true" header-row="true">
		<tr><td>Status</td><td>Description</td><td>Schema</td></tr>
		<tr><td>`200`</td><td>Successful Response</td><td>application/json: None</td></tr>
		<tr><td>`422`</td><td>Validation Error</td><td>application/json: HTTPValidationError</td></tr>
	</table>

## <span color="red">DELETE</span> `/api/posts/{post_id}` {toggle="true"}
	**Summary**: Delete Post
	**Operation ID**: `delete_post_api_posts__post_id__delete`
	**Auth**: Bearer
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

## <span color="orange">PUT</span> `/api/posts/{post_id}/pin` {toggle="true"}
	**Summary**: Set Post Pin
	**Operation ID**: `set_post_pin_api_posts__post_id__pin_put`
	**Auth**: Bearer
	### Parameters
	<table fit-page-width="true" header-row="true">
		<tr><td>Name</td><td>In</td><td>Required</td><td>Schema</td></tr>
		<tr><td>`post_id`</td><td>path</td><td>True</td><td>integer</td></tr>
	</table>
	### Request Body
	`application/json: object`
	### Responses
	<table fit-page-width="true" header-row="true">
		<tr><td>Status</td><td>Description</td><td>Schema</td></tr>
		<tr><td>`200`</td><td>Successful Response</td><td>application/json: None</td></tr>
		<tr><td>`422`</td><td>Validation Error</td><td>application/json: HTTPValidationError</td></tr>
	</table>

## <span color="green">POST</span> `/api/posts/{post_id}/like` {toggle="true"}
	**Summary**: Toggle Like
	**Operation ID**: `toggle_like_api_posts__post_id__like_post`
	**Auth**: Bearer
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

## <span color="green">POST</span> `/api/posts/{post_id}/bookmark` {toggle="true"}
	**Summary**: Toggle Bookmark
	**Operation ID**: `toggle_bookmark_api_posts__post_id__bookmark_post`
	**Auth**: Bearer
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

## <span color="orange">PUT</span> `/api/posts/{post_id}/suggestion` {toggle="true"}
	**Summary**: Update Suggestion
	**Operation ID**: `update_suggestion_api_posts__post_id__suggestion_put`
	**Auth**: Bearer
	### Parameters
	<table fit-page-width="true" header-row="true">
		<tr><td>Name</td><td>In</td><td>Required</td><td>Schema</td></tr>
		<tr><td>`post_id`</td><td>path</td><td>True</td><td>integer</td></tr>
	</table>
	### Request Body
	`application/json: SuggestionUpdate`
	### Responses
	<table fit-page-width="true" header-row="true">
		<tr><td>Status</td><td>Description</td><td>Schema</td></tr>
		<tr><td>`200`</td><td>Successful Response</td><td>application/json: None</td></tr>
		<tr><td>`422`</td><td>Validation Error</td><td>application/json: HTTPValidationError</td></tr>
	</table>