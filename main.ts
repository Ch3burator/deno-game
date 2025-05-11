import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { handleRoutes } from "./server/routes.ts";

serve((req: Request) => handleRoutes(req));