import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SPEAK_TOPICS, findSpeakTopic } from '@/data/speak/topics';
import { SpeakTopicView } from '@/features/speak/speak-topic-view';

export const dynamicParams = false;

export function generateStaticParams() {
  return SPEAK_TOPICS.map((t) => ({ topicId: t.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ topicId: string }> }): Promise<Metadata> {
  const { topicId } = await params;
  const topic = findSpeakTopic(topicId);
  return { title: topic ? `${topic.title} · Speak` : 'Speak' };
}

export default async function SpeakTopicPage({ params }: { params: Promise<{ topicId: string }> }) {
  const { topicId } = await params;
  const topic = findSpeakTopic(topicId);
  if (!topic) notFound();
  return <SpeakTopicView topic={topic} />;
}
