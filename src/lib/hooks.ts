import { useMemo } from 'react';
import { useDB, useMe, useT, useTenant } from '../store/db';
import { canAccess } from './modules';
import type { ModuleKey, Patient } from './types';

export function useCan() {
  const me = useMe();
  const tenant = useTenant();
  const imp = useDB((s) => s.session.impersonating);
  return (mod: ModuleKey) => !!me && !!tenant && canAccess(imp ? 'super_admin' : me.role, mod, tenant.modules);
}

export function usePatientMap() {
  const patients = useT('patients');
  return useMemo(() => new Map(patients.map((p) => [p.id, p])), [patients]);
}

export const fullName = (p?: Pick<Patient, 'firstName' | 'lastName'>) => (p ? `${p.firstName} ${p.lastName}`.trim() : 'Walk-in');

export function useLookup() {
  const services = useT('services');
  const staff = useT('staff');
  return useMemo(
    () => ({
      service: new Map(services.map((s) => [s.id, s])),
      staff: new Map(staff.map((s) => [s.id, s])),
    }),
    [services, staff],
  );
}
