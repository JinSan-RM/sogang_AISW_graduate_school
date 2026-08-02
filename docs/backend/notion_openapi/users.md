# OpenAPI: users

<table fit-page-width="true" header-row="true">
	<tr color="gray_bg"><td>Method</td><td>Path</td><td>Summary</td><td>Auth</td></tr>
	<tr><td><span color="blue">GET</span></td><td>`/api/users/me`</td><td>Get Me</td><td>Bearer</td></tr>
	<tr><td><span color="orange">PUT</span></td><td>`/api/users/me`</td><td>Update Me</td><td>Bearer</td></tr>
	<tr><td><span color="red">DELETE</span></td><td>`/api/users/me`</td><td>Deactivate Me</td><td>Bearer</td></tr>
	<tr><td><span color="orange">PUT</span></td><td>`/api/users/me/password`</td><td>Update Password</td><td>Bearer</td></tr>
</table>

## <span color="blue">GET</span> `/api/users/me` {toggle="true"}
	**Summary**: Get Me
	**Operation ID**: `get_me_api_users_me_get`
	**Auth**: Bearer
	### Responses
	<table fit-page-width="true" header-row="true">
		<tr><td>Status</td><td>Description</td><td>Schema</td></tr>
		<tr><td>`200`</td><td>Successful Response</td><td>application/json: None</td></tr>
	</table>

## <span color="orange">PUT</span> `/api/users/me` {toggle="true"}
	**Summary**: Update Me
	**Operation ID**: `update_me_api_users_me_put`
	**Auth**: Bearer
	### Request Body
	`application/json: UserMeUpdate`
	### Responses
	<table fit-page-width="true" header-row="true">
		<tr><td>Status</td><td>Description</td><td>Schema</td></tr>
		<tr><td>`200`</td><td>Successful Response</td><td>application/json: None</td></tr>
		<tr><td>`422`</td><td>Validation Error</td><td>application/json: HTTPValidationError</td></tr>
	</table>

## <span color="red">DELETE</span> `/api/users/me` {toggle="true"}
	**Summary**: Deactivate Me
	**Operation ID**: `deactivate_me_api_users_me_delete`
	**Auth**: Bearer
	### Request Body
	`application/json: {'anyOf': [{'$ref': '#/components/schemas/UserDeactivateRequest'}, {'type': 'null'}], 'title': ' '}`
	### Responses
	<table fit-page-width="true" header-row="true">
		<tr><td>Status</td><td>Description</td><td>Schema</td></tr>
		<tr><td>`200`</td><td>Successful Response</td><td>application/json: None</td></tr>
		<tr><td>`422`</td><td>Validation Error</td><td>application/json: HTTPValidationError</td></tr>
	</table>

## <span color="orange">PUT</span> `/api/users/me/password` {toggle="true"}
	**Summary**: Update Password
	**Operation ID**: `update_password_api_users_me_password_put`
	**Auth**: Bearer
	### Request Body
	`application/json: UserPasswordUpdate`
	### Responses
	<table fit-page-width="true" header-row="true">
		<tr><td>Status</td><td>Description</td><td>Schema</td></tr>
		<tr><td>`200`</td><td>Successful Response</td><td>application/json: None</td></tr>
		<tr><td>`422`</td><td>Validation Error</td><td>application/json: HTTPValidationError</td></tr>
	</table>