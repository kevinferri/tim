import { DashboardLayout } from "@/components/layouts/dashboard/dashboard-layout";
import { NotFound } from "@/components/ui/not-found";
import { prismaClient } from "@/lib/prisma/client";

export default async function GroupPage({
  params,
}: {
  params: { id: string };
}) {
  const circle = await prismaClient.circle.getMeCircleById({
    circleId: params.id,
    select: {
      id: true,
      name: true,
    },
  });

  return (
    <DashboardLayout circleId={circle?.id}>
      {circle ? (
        <>
          <h1>{circle.name}</h1>
          <div>Will list the topics for group id {params.id}</div>
        </>
      ) : (
        <NotFound copy="Topic not found" />
      )}
    </DashboardLayout>
  );
}
