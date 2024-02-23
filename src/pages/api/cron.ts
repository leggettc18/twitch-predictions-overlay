import { type NextApiRequest, type NextApiResponse } from "next";
import { env } from "~/env";

import { createTRPCContext } from "~/server/api/trpc";
import validateAndRefreshToken from "~/utils/validateAndRefreshToken";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.headers.authorization ?? "" !== `Bearer ${env.CRON_SECRET}`) {
    return res.status(401).end("Unauthorized");
  }
  const ctx = await createTRPCContext({ req, res });
  const accounts = await ctx.db.account.findMany();
  accounts.forEach((account) => {
    void validateAndRefreshToken(account);
  });
  res.status(200).end("Tokens Validated and Refreshed");
}
