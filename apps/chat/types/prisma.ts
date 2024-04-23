import { Prisma } from "@prisma/client";
import { Types } from "@prisma/client/runtime/library";

type PayloadToModel<T> = Types.Result.DefaultSelection<T>;
export type WithRelation<
  T extends keyof Prisma.TypeMap["model"],
  R extends keyof Prisma.TypeMap["model"][T]["payload"]["objects"]
> = PayloadToModel<Prisma.TypeMap["model"][T]["payload"]> & {
  [K in R]: PayloadToModel<Prisma.TypeMap["model"][T]["payload"]["objects"][K]>;
};
