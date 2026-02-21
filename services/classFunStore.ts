import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';

// --- Types ---
export interface ClassGroup {
  id: string;
  class_id: string;
  name: string;
  color: string;
  sort_order: number;
}

export interface Behavior {
  id: string;
  teacher_id: string;
  description: string;
  type: 'POSITIVE' | 'NEGATIVE';
  points: number;
}

export interface BehaviorLog {
  id: string;
  student_id: string;
  class_id: string;
  behavior_id: string | null;
  points: number;
  reason: string | null;
  recorded_by: string | null;
  created_at: string;
  // Joined fields
  student_name?: string;
  group_name?: string;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  class_id: string;
  date: string;
  status: 'present' | 'excused' | 'unexcused';
}

export interface GroupMember {
  group_id: string;
  student_id: string;
}

// --- Store Interface ---
interface ClassFunState {
  // Data
  groups: ClassGroup[];
  behaviors: Behavior[];
  logs: BehaviorLog[];
  attendance: AttendanceRecord[];
  groupMembers: GroupMember[];
  isLoading: boolean;

  // Actions - Groups
  fetchClassFunData: (classId: string, teacherId: string) => Promise<void>;
  addGroup: (group: Omit<ClassGroup, 'id'>) => Promise<void>;
  updateGroup: (id: string, data: Partial<ClassGroup>) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  addStudentToGroup: (groupId: string, studentId: string) => Promise<void>;
  removeStudentFromGroup: (groupId: string, studentId: string) => Promise<void>;

  // Actions - Behaviors
  addBehavior: (behavior: Omit<Behavior, 'id'>) => Promise<void>;
  updateBehavior: (id: string, data: Partial<Behavior>) => Promise<void>;
  deleteBehavior: (id: string) => Promise<void>;

  // Actions - Logs (Points)
  addBehaviorLog: (log: Omit<BehaviorLog, 'id' | 'created_at'>) => Promise<void>;
  batchAddBehaviorLogs: (logs: Omit<BehaviorLog, 'id' | 'created_at'>[]) => Promise<void>;
  fetchStudentLogs: (studentId: string) => Promise<void>;
  fetchAllBehaviorLogs: (classId: string) => Promise<void>;
  deleteBehaviorLog: (id: string) => Promise<void>;

  // Actions - Attendance
  saveAttendance: (records: Omit<AttendanceRecord, 'id'>[]) => Promise<void>;
  fetchAttendance: (classId: string, date: string) => Promise<void>;
}

export const useClassFunStore = create<ClassFunState>((set, get) => ({
  groups: [],
  behaviors: [],
  logs: [],
  attendance: [],
  groupMembers: [],
  isLoading: false,

  // --- Fetch all data for a class ---
  fetchClassFunData: async (classId, teacherId) => {
    set({ isLoading: true });
    try {
      // Fetch groups
      const { data: groups } = await supabase
        .from('class_groups')
        .select('*')
        .eq('class_id', classId)
        .order('sort_order');

      // Fetch behaviors for this teacher
      const { data: behaviors } = await supabase
        .from('behaviors')
        .select('*')
        .eq('teacher_id', teacherId);

      // Fetch behavior logs for this class (last 500 entries)
      const { data: logs } = await supabase
        .from('behavior_logs')
        .select('*')
        .eq('class_id', classId)
        .order('created_at', { ascending: false })
        .limit(500);

      // Fetch group members
      const groupIds = (groups || []).map(g => g.id);
      let groupMembers: GroupMember[] = [];
      if (groupIds.length > 0) {
        const { data: members } = await supabase
          .from('class_group_members')
          .select('*')
          .in('group_id', groupIds);
        groupMembers = (members || []) as GroupMember[];
      }

      set({
        groups: (groups || []) as ClassGroup[],
        behaviors: (behaviors || []) as Behavior[],
        logs: (logs || []) as BehaviorLog[],
        groupMembers,
      });
    } catch (e) {
      console.error('Error fetching ClassFun data:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  // --- Groups ---
  addGroup: async (group) => {
    const newId = `grp_${Date.now()}`;
    const newGroup = { ...group, id: newId };
    const { error } = await supabase.from('class_groups').insert(newGroup);
    if (!error) set(s => ({ groups: [...s.groups, newGroup as ClassGroup] }));
  },

  updateGroup: async (id, data) => {
    const { error } = await supabase.from('class_groups').update(data).eq('id', id);
    if (!error) set(s => ({ groups: s.groups.map(g => g.id === id ? { ...g, ...data } : g) }));
  },

  deleteGroup: async (id) => {
    const { error } = await supabase.from('class_groups').delete().eq('id', id);
    if (!error) set(s => ({
      groups: s.groups.filter(g => g.id !== id),
      groupMembers: s.groupMembers.filter(m => m.group_id !== id),
    }));
  },

  addStudentToGroup: async (groupId, studentId) => {
    const { error } = await supabase.from('class_group_members').insert({ group_id: groupId, student_id: studentId });
    if (!error) set(s => ({ groupMembers: [...s.groupMembers, { group_id: groupId, student_id: studentId }] }));
  },

  removeStudentFromGroup: async (groupId, studentId) => {
    const { error } = await supabase.from('class_group_members').delete()
      .eq('group_id', groupId).eq('student_id', studentId);
    if (!error) set(s => ({
      groupMembers: s.groupMembers.filter(m => !(m.group_id === groupId && m.student_id === studentId)),
    }));
  },

  // --- Behaviors ---
  addBehavior: async (behavior) => {
    const newId = `beh_${Date.now()}`;
    const newBehavior = { ...behavior, id: newId };
    const { error } = await supabase.from('behaviors').insert(newBehavior);
    if (!error) set(s => ({ behaviors: [...s.behaviors, newBehavior as Behavior] }));
  },

  updateBehavior: async (id, data) => {
    const { error } = await supabase.from('behaviors').update(data).eq('id', id);
    if (!error) set(s => ({ behaviors: s.behaviors.map(b => b.id === id ? { ...b, ...data } : b) }));
  },

  deleteBehavior: async (id) => {
    const { error } = await supabase.from('behaviors').delete().eq('id', id);
    if (!error) set(s => ({ behaviors: s.behaviors.filter(b => b.id !== id) }));
  },

  // --- Logs (Points) ---
  addBehaviorLog: async (log) => {
    const newId = `log_${Date.now()}`;
    const newLog = { ...log, id: newId, created_at: new Date().toISOString() };
    const { error } = await supabase.from('behavior_logs').insert(newLog);
    if (!error) set(s => ({ logs: [newLog as BehaviorLog, ...s.logs] }));
  },

  batchAddBehaviorLogs: async (logs) => {
    const newLogs = logs.map((log, i) => ({
      ...log,
      id: `log_${Date.now()}_${i}`,
      created_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from('behavior_logs').insert(newLogs);
    if (!error) set(s => ({ logs: [...(newLogs as BehaviorLog[]), ...s.logs] }));
  },

  fetchStudentLogs: async (studentId) => {
    const { data } = await supabase
      .from('behavior_logs')
      .select('*, behaviors(*)')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });
    if (data) {
      // Map behavior description if joined
      const mappedLogs = data.map(d => ({
        ...d,
        reason: d.reason || d.behaviors?.description || 'Ghi nhận hành vi'
      }));
      set({ logs: mappedLogs as BehaviorLog[] });
    }
  },

  fetchAllBehaviorLogs: async (classId) => {
    const { data } = await supabase
      .from('behavior_logs')
      .select('*, behaviors(*)')
      .eq('class_id', classId)
      .order('created_at', { ascending: false });
    if (data) {
      // Map behavior description if joined
      const mappedLogs = data.map(d => ({
        ...d,
        reason: d.reason || d.behaviors?.description || 'Ghi nhận hành vi'
      }));
      set({ logs: mappedLogs as BehaviorLog[] });
    }
  },

  deleteBehaviorLog: async (id) => {
    const { error } = await supabase.from('behavior_logs').delete().eq('id', id);
    if (!error) set(s => ({ logs: s.logs.filter(l => l.id !== id) }));
  },

  // --- Attendance ---
  saveAttendance: async (records) => {
    // Upsert: nếu đã tồn tại thì cập nhật, chưa có thì thêm mới
    const upsertData = records.map(r => ({
      ...r,
      id: `att_${r.student_id}_${r.date}`,
    }));
    const { error } = await supabase.from('attendance').upsert(upsertData, {
      onConflict: 'student_id,class_id,date',
    });
    if (!error) {
      // Refresh attendance for the date
      const date = records[0]?.date;
      const classId = records[0]?.class_id;
      if (date && classId) {
        const { data } = await supabase.from('attendance').select('*')
          .eq('class_id', classId).eq('date', date);
        if (data) set({ attendance: data as AttendanceRecord[] });
      }
    }
  },

  fetchAttendance: async (classId, date) => {
    const { data } = await supabase.from('attendance').select('*')
      .eq('class_id', classId).eq('date', date);
    if (data) set({ attendance: data as AttendanceRecord[] });
  },
}));
