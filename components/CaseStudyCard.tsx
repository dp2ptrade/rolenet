import React from 'react';
import { View, StyleSheet, Image, Dimensions } from 'react-native';
import { Text, Card, Button } from 'react-native-paper';
import { CaseStudy } from '@/lib/types';
import { Award, TrendingUp } from 'lucide-react-native';

interface CaseStudyCardProps {
  caseStudy: CaseStudy;
  onPress?: (caseStudy: CaseStudy) => void;
}

const CaseStudyCard: React.FC<CaseStudyCardProps> = ({ caseStudy, onPress }) => {
  const handlePress = () => {
    if (onPress) {
      onPress(caseStudy);
    }
  };
  
  return (
    <Card style={styles.card} onPress={handlePress}>
      {caseStudy.media_urls && caseStudy.media_urls.length > 0 && (
        <Card.Cover 
          source={{ uri: caseStudy.media_urls[0] }} 
          style={styles.coverImage} 
        />
      )}
      
      <Card.Content style={styles.content}>
        <View style={styles.header}>
          <Award size={16} color="#3B82F6" />
          <Text style={styles.headerText}>Case Study</Text>
        </View>
        
        <Text style={styles.title}>{caseStudy.title}</Text>
        <Text style={styles.description} numberOfLines={3}>
          {caseStudy.description}
        </Text>
        
        {caseStudy.results && (
          <View style={styles.resultsContainer}>
            <TrendingUp size={16} color="#10B981" />
            <Text style={styles.resultsText}>{caseStudy.results}</Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );
};

const { width } = Dimensions.get('window');
const cardWidth = width > 500 ? 400 : width - 32;

const styles = StyleSheet.create({
  card: {
    width: cardWidth,
    marginRight: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    backgroundColor: 'white',
  },
  coverImage: {
    height: 150,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 12,
    lineHeight: 20,
  },
  resultsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 8,
    borderRadius: 8,
  },
  resultsText: {
    fontSize: 14,
    color: '#10B981',
    marginLeft: 8,
    flex: 1,
  },
});

export default CaseStudyCard;