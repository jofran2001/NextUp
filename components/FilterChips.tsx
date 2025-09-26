import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView
} from 'react-native';
import { TaskFilters } from '../services/task.service';

interface FilterChipsProps {
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
}

interface FilterOption {
  key: keyof TaskFilters;
  label: string;
  options: Array<{
    value: string;
    label: string;
    color: string;
  }>;
}

const filterOptions: FilterOption[] = [
  {
    key: 'status',
    label: 'Status',
    options: [
      { value: 'pendente', label: 'Pendente', color: '#F59E0B' },
      { value: 'em-andamento', label: 'Em Andamento', color: '#3B82F6' },
      { value: 'concluida', label: 'Concluída', color: '#10B981' },
      { value: 'alta', label: 'Alta Prioridade', color: '#EF4444' },
      { value: 'media', label: 'Média Prioridade', color: '#F59E0B' },
      { value: 'baixa', label: 'Baixa Prioridade', color: '#10B981' }
    ]
  },
  {
    key: 'priority',
    label: 'Prioridade',
    options: [
      { value: 'alta', label: 'Alta', color: '#EF4444' },
      { value: 'media', label: 'Média', color: '#F59E0B' },
      { value: 'baixa', label: 'Baixa', color: '#10B981' }
    ]
  }
];

export default function FilterChips({ filters, onFiltersChange }: FilterChipsProps) {
  const handleFilterToggle = (key: keyof TaskFilters, value: string) => {
    const currentValue = filters[key];
    const newValue = currentValue === value ? undefined : value;
    
    onFiltersChange({
      ...filters,
      [key]: newValue
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== undefined && value !== '');

  return (
    <View style={styles.container}>
      {/* Header com botão limpar */}
      <View style={styles.header}>
        <Text style={styles.title}>Filtros</Text>
        {hasActiveFilters && (
          <TouchableOpacity onPress={clearAllFilters} style={styles.clearButton}>
            <Text style={styles.clearText}>Limpar filtros</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filtros */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {filterOptions.map((filterGroup) => (
          <View key={filterGroup.key} style={styles.filterGroup}>
            <Text style={styles.filterLabel}>{filterGroup.label}</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.chipScrollView}
            >
              <View style={styles.chipsContainer}>
                {filterGroup.options.map((option) => {
                  const isActive = filters[filterGroup.key] === option.value;
                  
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.chip,
                        {
                          borderColor: option.color,
                          backgroundColor: isActive ? option.color : '#fff'
                        }
                      ]}
                      onPress={() => handleFilterToggle(filterGroup.key, option.value)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: isActive ? '#fff' : option.color }
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        ))}

        {/* Filtros ativos */}
        {hasActiveFilters && (
          <View style={styles.activeFiltersSection}>
            <Text style={styles.activeFiltersTitle}>Filtros ativos:</Text>
            <View style={styles.activeFiltersContainer}>
              {Object.entries(filters).map(([key, value]) => {
                if (!value) return null;
                
                const filterGroup = filterOptions.find(f => f.key === key);
                const option = filterGroup?.options.find(o => o.value === value);
                
                if (!option) return null;
                
                return (
                  <View key={`${key}-${value}`} style={styles.activeFilter}>
                    <Text style={styles.activeFilterText}>
                      {filterGroup?.label}: {option.label}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleFilterToggle(key as keyof TaskFilters, value)}
                      style={styles.removeFilterButton}
                    >
                      <Text style={styles.removeFilterText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
  },
  clearText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterGroup: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  chipScrollView: {
    flexGrow: 0,
  },
  chipsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: '#fff',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  activeFiltersSection: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  activeFiltersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  activeFiltersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  activeFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  activeFilterText: {
    fontSize: 12,
    color: '#374151',
  },
  removeFilterButton: {
    padding: 2,
  },
  removeFilterText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: 'bold',
  },
});
