import { Redirect } from "expo-router";

import { eventRootRoute } from "../../../utils/appRoutes";

export default function EventsIndexRedirect() {
  return <Redirect href={eventRootRoute()} />;
}
