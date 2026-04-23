import type { URI, SyncronizingStore, SyncRecord } from "../types/sync.js";
import type { CrudStore } from "../types/crud.js";


/** Volunteer profile (minimal; extend as needed). */
export interface Volunteer extends SyncRecord {
  name?: string;
  location?: string;
  created: string;
}

export interface CreateVolunteerParams {
  uri: URI;
  name?: string;
  location?: string;
}

export interface UpdateVolunteerParams {
  uri: URI;
  name?: string;
  location?: string;
}

export interface VolunteerStore
    extends SyncronizingStore<Volunteer>, CrudStore<URI, Volunteer, CreateVolunteerParams, UpdateVolunteerParams> {
}
