# OpenAPI: default

<table fit-page-width="true" header-row="true">
	<tr color="gray_bg"><td>Method</td><td>Path</td><td>Summary</td><td>Auth</td></tr>
	<tr><td><span color="blue">GET</span></td><td>`/health`</td><td>Health Check</td><td>guest/optional</td></tr>
</table>

## <span color="blue">GET</span> `/health` {toggle="true"}
	**Summary**: Health Check
	**Operation ID**: `health_check_health_get`
	**Auth**: guest/optional
	### Responses
	<table fit-page-width="true" header-row="true">
		<tr><td>Status</td><td>Description</td><td>Schema</td></tr>
		<tr><td>`200`</td><td>Successful Response</td><td>application/json: None</td></tr>
	</table>