/** Organization record (minimal; extend as needed). */
export interface Organization {
  id: string;
  name: string;
}

export interface OrganizationStore {
  list: () => Promise<Organization[]>;
  read: (id: string) => Promise<Organization | undefined>;
  create: (input: Omit<Organization, "id"> & { id?: string }) => Promise<Organization>;
  update: (organization: Organization) => Promise<Organization>;
  delete: (id: string) => Promise<void>;
}
