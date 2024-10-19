-- CreateTable
CREATE TABLE "_DepartmentOperationGroups" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_DepartmentOperationGroups_AB_unique" ON "_DepartmentOperationGroups"("A", "B");

-- CreateIndex
CREATE INDEX "_DepartmentOperationGroups_B_index" ON "_DepartmentOperationGroups"("B");

-- AddForeignKey
ALTER TABLE "_DepartmentOperationGroups" ADD CONSTRAINT "_DepartmentOperationGroups_A_fkey" FOREIGN KEY ("A") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DepartmentOperationGroups" ADD CONSTRAINT "_DepartmentOperationGroups_B_fkey" FOREIGN KEY ("B") REFERENCES "OperationGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
