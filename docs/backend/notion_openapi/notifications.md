# OpenAPI: notifications

<table fit-page-width="true" header-row="true">
	<tr color="gray_bg"><td>Method</td><td>Path</td><td>Summary</td><td>Auth</td></tr>
	<tr><td><span color="blue">GET</span></td><td>`/api/notifications`</td><td>Get Notifications</td><td>Bearer</td></tr>
	<tr><td><span color="orange">PUT</span></td><td>`/api/notifications/{notification_id}/read`</td><td>Mark Notification Read</td><td>Bearer</td></tr>
	<tr><td><span color="blue">GET</span></td><td>`/api/notifications/settings/me`</td><td>Get Notification Settings</td><td>Bearer</td></tr>
	<tr><td><span color="orange">PUT</span></td><td>`/api/notifications/settings/me`</td><td>Update Notification Settings</td><td>Bearer</td></tr>
	<tr><td><span color="green">POST</span></td><td>`/api/notifications/push-token`</td><td>Register Push Token</td><td>Bearer</td></tr>
	<tr><td><span color="red">DELETE</span></td><td>`/api/notifications/push-token`</td><td>Deactivate Push Token</td><td>Bearer</td></tr>
</table>

## <span color="blue">GET</span> `/api/notifications` {toggle="true"}
	**Summary**: Get Notifications
	**Operation ID**: `get_notifications_api_notifications_get`
	**Auth**: Bearer
	### Responses
	<table fit-page-width="true" header-row="true">
		<tr><td>Status</td><td>Description</td><td>Schema</td></tr>
		<tr><td>`200`</td><td>Successful Response</td><td>application/json: None</td></tr>
	</table>

## <span color="orange">PUT</span> `/api/notifications/{notification_id}/read` {toggle="true"}
	**Summary**: Mark Notification Read
	**Operation ID**: `mark_notification_read_api_notifications__notification_id__read_put`
	**Auth**: Bearer
	### Parameters
	<table fit-page-width="true" header-row="true">
		<tr><td>Name</td><td>In</td><td>Required</td><td>Schema</td></tr>
		<tr><td>`notification_id`</td><td>path</td><td>True</td><td>integer</td></tr>
	</table>
	### Responses
	<table fit-page-width="true" header-row="true">
		<tr><td>Status</td><td>Description</td><td>Schema</td></tr>
		<tr><td>`200`</td><td>Successful Response</td><td>application/json: None</td></tr>
		<tr><td>`422`</td><td>Validation Error</td><td>application/json: HTTPValidationError</td></tr>
	</table>

## <span color="blue">GET</span> `/api/notifications/settings/me` {toggle="true"}
	**Summary**: Get Notification Settings
	**Operation ID**: `get_notification_settings_api_notifications_settings_me_get`
	**Auth**: Bearer
	### Responses
	<table fit-page-width="true" header-row="true">
		<tr><td>Status</td><td>Description</td><td>Schema</td></tr>
		<tr><td>`200`</td><td>Successful Response</td><td>application/json: None</td></tr>
	</table>

## <span color="orange">PUT</span> `/api/notifications/settings/me` {toggle="true"}
	**Summary**: Update Notification Settings
	**Operation ID**: `update_notification_settings_api_notifications_settings_me_put`
	**Auth**: Bearer
	### Request Body
	`application/json: NotificationSettingUpdate`
	### Responses
	<table fit-page-width="true" header-row="true">
		<tr><td>Status</td><td>Description</td><td>Schema</td></tr>
		<tr><td>`200`</td><td>Successful Response</td><td>application/json: None</td></tr>
		<tr><td>`422`</td><td>Validation Error</td><td>application/json: HTTPValidationError</td></tr>
	</table>

## <span color="green">POST</span> `/api/notifications/push-token` {toggle="true"}
	**Summary**: Register Push Token
	**Operation ID**: `register_push_token_api_notifications_push_token_post`
	**Auth**: Bearer
	### Request Body
	`application/json: PushTokenRegister`
	### Responses
	<table fit-page-width="true" header-row="true">
		<tr><td>Status</td><td>Description</td><td>Schema</td></tr>
		<tr><td>`200`</td><td>Successful Response</td><td>application/json: None</td></tr>
		<tr><td>`422`</td><td>Validation Error</td><td>application/json: HTTPValidationError</td></tr>
	</table>

## <span color="red">DELETE</span> `/api/notifications/push-token` {toggle="true"}
	**Summary**: Deactivate Push Token
	**Operation ID**: `deactivate_push_token_api_notifications_push_token_delete`
	**Auth**: Bearer
	### Request Body
	`application/json: PushTokenRegister`
	### Responses
	<table fit-page-width="true" header-row="true">
		<tr><td>Status</td><td>Description</td><td>Schema</td></tr>
		<tr><td>`200`</td><td>Successful Response</td><td>application/json: None</td></tr>
		<tr><td>`422`</td><td>Validation Error</td><td>application/json: HTTPValidationError</td></tr>
	</table>