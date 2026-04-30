/**
 * Lightweight markdown renderer for chat messages.
 * Handles: **bold**, *italic*, `code`, # headings, bullet/numbered lists.
 * No external dependencies — pure React Native Text.
 */
import { Text, View, StyleSheet } from 'react-native';
import { colors } from '@/lib/colors';

interface Props {
  children: string;
  style?: object;
}

interface Segment {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
}

function parseInline(line: string): Segment[] {
  const segments: Segment[] = [];
  // Pattern: **bold**, *italic*, `code`
  const re = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(line)) !== null) {
    if (match.index > last) {
      segments.push({ text: line.slice(last, match.index) });
    }
    if (match[1]) {
      segments.push({ text: match[2], bold: true });
    } else if (match[3]) {
      segments.push({ text: match[4], italic: true });
    } else if (match[5]) {
      segments.push({ text: match[6], code: true });
    }
    last = match.index + match[0].length;
  }
  if (last < line.length) {
    segments.push({ text: line.slice(last) });
  }
  return segments;
}

function InlineText({ segments }: { segments: Segment[] }) {
  return (
    <>
      {segments.map((seg, i) => (
        <Text
          key={i}
          style={[
            seg.bold && styles.bold,
            seg.italic && styles.italic,
            seg.code && styles.inlineCode,
          ]}
        >
          {seg.text}
        </Text>
      ))}
    </>
  );
}

export function MarkdownText({ children, style }: Props) {
  const lines = children.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Headings
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3;
      const headingStyle = level === 1 ? styles.h1 : level === 2 ? styles.h2 : styles.h3;
      elements.push(
        <Text key={i} style={[styles.base, headingStyle, style]}>
          <InlineText segments={parseInline(headingMatch[2])} />
        </Text>,
      );
      i++;
      continue;
    }

    // Bullet list item
    const bulletMatch = line.match(/^[-*•]\s+(.+)/);
    if (bulletMatch) {
      elements.push(
        <View key={i} style={styles.listRow}>
          <Text style={[styles.base, styles.bullet, style]}>•</Text>
          <Text style={[styles.base, styles.listText, style]}>
            <InlineText segments={parseInline(bulletMatch[1])} />
          </Text>
        </View>,
      );
      i++;
      continue;
    }

    // Numbered list item
    const numberedMatch = line.match(/^(\d+)\.\s+(.+)/);
    if (numberedMatch) {
      elements.push(
        <View key={i} style={styles.listRow}>
          <Text style={[styles.base, styles.bullet, style]}>{numberedMatch[1]}.</Text>
          <Text style={[styles.base, styles.listText, style]}>
            <InlineText segments={parseInline(numberedMatch[2])} />
          </Text>
        </View>,
      );
      i++;
      continue;
    }

    // Blank line — small vertical gap
    if (line.trim() === '') {
      elements.push(<View key={i} style={styles.spacer} />);
      i++;
      continue;
    }

    // Regular paragraph line
    elements.push(
      <Text key={i} style={[styles.base, style]}>
        <InlineText segments={parseInline(line)} />
      </Text>,
    );
    i++;
  }

  return <View>{elements}</View>;
}

const styles = StyleSheet.create({
  base: {
    fontSize: 15,
    color: colors.foreground,
    lineHeight: 22,
  },
  bold: {
    fontWeight: '700',
  },
  italic: {
    fontStyle: 'italic',
  },
  inlineCode: {
    fontFamily: 'monospace',
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 3,
    paddingHorizontal: 3,
    fontSize: 13,
  },
  h1: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  h2: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 3,
  },
  h3: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 2,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 3,
    gap: 6,
  },
  bullet: {
    lineHeight: 22,
    color: colors.foreground,
  },
  listText: {
    flex: 1,
  },
  spacer: {
    height: 6,
  },
});
