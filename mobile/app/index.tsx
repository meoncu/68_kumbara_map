import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Task {
  id: string;
  firmName: string;
  address: string;
  status: 'pending' | 'in_progress' | 'completed';
  piggyBanks: number;
  order: number;
}

const mockTasks: Task[] = [
  { id: '1', firmName: 'Yıldız Market', address: 'Kızılay Mah. 1. Sok. No: 1', status: 'pending', piggyBanks: 2, order: 1 },
  { id: '2', firmName: 'Güneş Kafe', address: 'Kavaklıdere Mah. 2. Sok. No: 2', status: 'pending', piggyBanks: 1, order: 2 },
  { id: '3', firmName: 'Mavi Restoran', address: 'Gazi Mah. 3. Sok. No: 3', status: 'pending', piggyBanks: 3, order: 3 },
  { id: '4', firmName: 'Altın Otel', address: 'Ostim Mah. 4. Sok. No: 4', status: 'pending', piggyBanks: 2, order: 4 },
  { id: '5', firmName: 'Bilim Okulu', address: 'Batıkent Mah. 5. Sok. No: 5', status: 'pending', piggyBanks: 1, order: 5 },
];

export default function TasksScreen() {
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [activeTask, setActiveTask] = useState<string | null>(null);

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'completed': return '#10B981';
      case 'in_progress': return '#3B82F6';
      default: return '#9CA3AF';
    }
  };

  const getStatusText = (status: Task['status']) => {
    switch (status) {
      case 'completed': return 'Tamamlandı';
      case 'in_progress': return 'Devam Ediyor';
      default: return 'Beklemede';
    }
  };

  const startTask = (id: string) => {
    setActiveTask(id);
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, status: 'in_progress' } : task
    ));
  };

  const completeTask = (id: string) => {
    setActiveTask(null);
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, status: 'completed' } : task
    ));
  };

  const renderTask = ({ item }: { item: Task }) => (
    <TouchableOpacity 
      style={[styles.taskCard, item.status === 'completed' && styles.completedCard]}
      onPress={() => item.status === 'pending' && startTask(item.id)}
    >
      <View style={styles.taskHeader}>
        <View style={styles.orderNumber}>
          <Text style={styles.orderText}>{item.order}</Text>
        </View>
        <View style={styles.taskInfo}>
          <Text style={styles.firmName}>{item.firmName}</Text>
          <Text style={styles.address}>{item.address}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>
      
      <View style={styles.taskFooter}>
        <View style={styles.piggyBankInfo}>
          <MaterialCommunityIcons name="piggy-bank" size={16} color="#6B7280" />
          <Text style={styles.piggyBankText}>{item.piggyBanks} Kumbara</Text>
        </View>

        {item.status === 'in_progress' && (
          <TouchableOpacity 
            style={styles.completeButton}
            onPress={() => completeTask(item.id)}
          >
            <Text style={styles.completeButtonText}>Tamamla</Text>
          </TouchableOpacity>
        )}

        {item.status === 'pending' && (
          <TouchableOpacity 
            style={styles.startButton}
            onPress={() => startTask(item.id)}
          >
            <Text style={styles.startButtonText}>Başlat</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const totalCount = tasks.length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3B82F6" />
      
      <View style={styles.summaryBar}>
        <Text style={styles.summaryText}>
          Bugünkü Görevler: {completedCount}/{totalCount}
        </Text>
      </View>

      <FlatList
        data={tasks}
        renderItem={renderTask}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  summaryBar: {
    backgroundColor: '#1E40AF',
    padding: 16,
    alignItems: 'center',
  },
  summaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  completedCard: {
    opacity: 0.7,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  orderText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  taskInfo: {
    flex: 1,
  },
  firmName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
  },
  piggyBankInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  piggyBankText: {
    fontSize: 14,
    color: '#6B7280',
  },
  startButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  completeButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});
