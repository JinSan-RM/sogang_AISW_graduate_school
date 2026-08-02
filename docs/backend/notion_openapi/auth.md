# OpenAPI: auth

<table fit-page-width="true" header-row="true">
	<tr color="gray_bg"><td>Method</td><td>Path</td><td>Summary</td><td>Auth</td></tr>
	<tr><td><span color="green">POST</span></td><td>`/api/auth/login`</td><td>Login</td><td>guest/optional</td></tr>
	<tr><td><span color="green">POST</span></td><td>`/api/auth/register/request-verification`</td><td>Request Register Verification</td><td>guest/optional</td></tr>
	<tr><td><span color="green">POST</span></td><td>`/api/auth/register/verify-email`</td><td>Verify Register Email</td><td>guest/optional</td></tr>
	<tr><td><span color="green">POST</span></td><td>`/api/auth/register`</td><td>Register</td><td>guest/optional</td></tr>
	<tr><td><span color="green">POST</span></td><td>`/api/auth/refresh`</td><td>Refresh</td><td>guest/optional</td></tr>
	<tr><td><span color="green">POST</span></td><td>`/api/auth/logout`</td><td>Logout</td><td>Bearer</td></tr>
	<tr><td><span color="green">POST</span></td><td>`/api/auth/password-reset/request`</td><td>Request Password Reset</td><td>guest/optional</td></tr>
	<tr><td><span color="green">POST</span></td><td>`/api/auth/password-reset/confirm`</td><td>Confirm Password Reset</td><td>guest/optional</td></tr>
</table>

## <span color="green">POST</span> `/api/auth/login` {toggle="true"}
	**Summary**: Login
	**Operation ID**: `login_api_auth_login_post`
	**Auth**: guest/optional
	### Request Body
	`application/json: LoginRequest`
	### Responses
	<table fit-page-width="true" header-row="true">
		<tr><td>Status</td><td>Description</td><td>Schema</td></tr>
		<tr><td>`200`</td><td>Successful Response</td><td>application/json: None</td></tr>
		<tr><td>`422`</td><td>Validation Error</td><td>application/json: HTTPValidationError</td></tr>
	</table>

## <span color="green">POST</span> `/api/auth/register/request-verification` {toggle="true"}
	**Summary**: Request Register Verification
	**Operation ID**: `request_register_verification_api_auth_register_request_verification_post`
	**Auth**: guest/optional
	### Request Body
	`application/json: EmailVerificationRequest`
	### Responses
	<table fit-page-width="true" header-row="true">
		<tr><td>Status</td><td>Description</td><td>Schema</td></tr>
		<tr><td>`200`</td><td>Successful Response</td><td>application/json: None</td></tr>
		<tr><td>`422`</td><td>Validation Error</td><td>application/json: HTTPValidationError</td></tr>
	</table>

## <span color="green">POST</span> `/api/auth/register/verify-email` {toggle="true"}
	**Summary**: Verify Register Email
	**Operation ID**: `verify_register_email_api_auth_register_verify_email_post`
	**Auth**: guest/optional
	### Request Body
	`application/json: EmailVerificationConfirm`
	### Responses
	<table fit-page-width="true" header-row="true">
		<tr><td>Status</td><td>Description</td><td>Schema</td></tr>
		<tr><td>`200`</td><td>Successful Response</td><td>application/json: None</td></tr>
		<tr><td>`422`</td><td>Validation Error</td><td>application/json: HTTPValidationError</td></tr>
	</table>

## <span color="green">POST</span> `/api/auth/register` {toggle="true"}
	**Summary**: Register
	**Operation ID**: `register_api_auth_register_post`
	**Auth**: guest/optional
	### Request Body
	`application/json: RegisterRequest`
	### Responses
	<table fit-page-width="true" header-row="true">
		<tr><td>Status</td><td>Description</td><td>Schema</td></tr>
		<tr><td>`200`</td><td>Successful Response</td><td>application/json: None</td></tr>
		<tr><td>`422`</td><td>Validation Error</td><td>application/json: HTTPValidationError</td></tr>
	</table>

## <span color="green">POST</span> `/api/auth/refresh` {toggle="true"}
	**Summary**: Refresh
	**Operation ID**: `refresh_api_auth_refresh_post`
	**Auth**: guest/optional
	### Request Body
	`application/json: RefreshRequest`
	### Responses
	<table fit-page-width="true" header-row="true">
		<tr><td>Status</td><td>Description</td><td>Schema</td></tr>
		<tr><td>`200`</td><td>Successful Response</td><td>application/json: None</td></tr>
		<tr><td>`422`</td><td>Validation Error</td><td>application/json: HTTPValidationError</td></tr>
	</table>

## <span color="green">POST</span> `/api/auth/logout` {toggle="true"}
	**Summary**: Logout
	**Operation ID**: `logout_api_auth_logout_post`
	**Auth**: Bearer
	### Request Body
	`application/json: LogoutRequest`
	### Responses
	<table fit-page-width="true" header-row="true">
		<tr><td>Status</td><td>Description</td><td>Schema</td></tr>
		<tr><td>`200`</td><td>Successful Response</td><td>application/json: None</td></tr>
		<tr><td>`422`</td><td>Validation Error</td><td>application/json: HTTPValidationError</td></tr>
	</table>

## <span color="green">POST</span> `/api/auth/password-reset/request` {toggle="true"}
	**Summary**: Request Password Reset
	**Operation ID**: `request_password_reset_api_auth_password_reset_request_post`
	**Auth**: guest/optional
	### Request Body
	`application/json: PasswordResetRequest`
	### Responses
	<table fit-page-width="true" header-row="true">
		<tr><td>Status</td><td>Description</td><td>Schema</td></tr>
		<tr><td>`200`</td><td>Successful Response</td><td>application/json: None</td></tr>
		<tr><td>`422`</td><td>Validation Error</td><td>application/json: HTTPValidationError</td></tr>
	</table>

## <span color="green">POST</span> `/api/auth/password-reset/confirm` {toggle="true"}
	**Summary**: Confirm Password Reset
	**Operation ID**: `confirm_password_reset_api_auth_password_reset_confirm_post`
	**Auth**: guest/optional
	### Request Body
	`application/json: PasswordResetConfirm`
	### Responses
	<table fit-page-width="true" header-row="true">
		<tr><td>Status</td><td>Description</td><td>Schema</td></tr>
		<tr><td>`200`</td><td>Successful Response</td><td>application/json: None</td></tr>
		<tr><td>`422`</td><td>Validation Error</td><td>application/json: HTTPValidationError</td></tr>
	</table>