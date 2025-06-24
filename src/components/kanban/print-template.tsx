import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { Card } from '@/lib/types';

// No font registration - using built-in fonts only for reliability
const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#FFFFFF',
    fontFamily: 'Helvetica',
  },
  table: {
    display: 'flex',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 2,
    borderColor: '#000000',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    minHeight: 40,
  },
  lastRow: {
    flexDirection: 'row',
    minHeight: 250,
  },
  tableColLeft: {
    width: '50%',
    borderRightWidth: 1,
    borderRightColor: '#000000',
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
  },
  tableColRight: {
    width: '50%',
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
  },
  content: {
    fontSize: 12,
    lineHeight: 1.5,
    flex: 1,
    fontFamily: 'Helvetica',
  },
  questionContent: {
    fontSize: 12,
    lineHeight: 1.5,
    flex: 1,
    paddingTop: 8,
    fontFamily: 'Helvetica',
  },
  gujaratiText: {
    fontSize: 12,
    lineHeight: 1.5,
    flex: 1,
    paddingTop: 8,
    fontFamily: 'Helvetica', // Using Helvetica for now - will display as Unicode
  }
});

interface PrintTemplateProps {
  card: Card;
}

export const PrintTemplate: React.FC<PrintTemplateProps> = ({ card }) => {
  const formData = card.metadata?.formData || {};
  const fullName = `${formData.firstname || ''} ${formData.lastname || ''}`.trim();
  const gnanTaken = formData.gnan_vidhi_year ? 'Y' : 'N';
  const date = new Date(card.metadata?.submissionTimestamp || card.createdAt).toLocaleDateString('en-US');
  
  // Get Gujarati translation - prioritize approved translation, fall back to working translation
  const gujaratiText = card.metadata?.approvedTranslation || 
                      card.metadata?.gujaratiTranslation || 
                      '';
  
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.table}>
          {/* First Row: Name and Gnan Taken */}
          <View style={styles.tableRow}>
            <View style={styles.tableColLeft}>
              <Text style={styles.header}>Mahatma name:</Text>
              <Text style={styles.content}>{fullName || ''}</Text>
            </View>
            <View style={styles.tableColRight}>
              <Text style={styles.header}>Gnan taken: Y/N</Text>
              <Text style={styles.content}>{gnanTaken}</Text>
            </View>
          </View>

          {/* Second Row: Date and Age */}
          <View style={styles.tableRow}>
            <View style={styles.tableColLeft}>
              <Text style={styles.header}>Date:</Text>
              <Text style={styles.content}>{date}</Text>
            </View>
            <View style={styles.tableColRight}>
              <Text style={styles.header}>Age:</Text>
              <Text style={styles.content}>{formData.age || ''}</Text>
            </View>
          </View>

          {/* Third Row: Questions */}
          <View style={styles.lastRow}>
            <View style={styles.tableColLeft}>
              <Text style={styles.header}>English:</Text>
              <Text style={styles.questionContent}>
                {formData.english_question || ''}
              </Text>
            </View>
            <View style={styles.tableColRight}>
              <Text style={styles.header}>Gujarati:</Text>
              <Text style={styles.gujaratiText}>
                {gujaratiText || 'No translation available'}
              </Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}; 