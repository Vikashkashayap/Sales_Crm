import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { CONVERTED_STATUSES } from '../utils/studentConstants';

export function useStudentRegistration(onRefresh) {
  const [registerLead, setRegisterLead] = useState(null);
  const [registeredLeadIds, setRegisteredLeadIds] = useState(new Set());

  const fetchRegisteredIds = useCallback(async () => {
    try {
      const res = await api.get('/students/registered-lead-ids');
      setRegisteredLeadIds(new Set((res.data.leadIds || []).map(String)));
    } catch {
      setRegisteredLeadIds(new Set());
    }
  }, []);

  useEffect(() => {
    fetchRegisteredIds();
  }, [fetchRegisteredIds]);

  const handleStatusChange = (lead, status) => {
    if (
      CONVERTED_STATUSES.includes(status) &&
      lead &&
      !registeredLeadIds.has(String(lead._id))
    ) {
      setRegisterLead(lead);
    }
  };

  const handleRegisterClick = (lead) => setRegisterLead(lead);

  const handleRegistrationSuccess = () => {
    setRegisterLead(null);
    fetchRegisteredIds();
    onRefresh?.();
  };

  return {
    registerLead,
    setRegisterLead,
    registeredLeadIds,
    handleStatusChange,
    handleRegisterClick,
    handleRegistrationSuccess,
    fetchRegisteredIds,
  };
}
