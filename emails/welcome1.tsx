import * as React from 'react';
import { Heading, Text, Section, Link, Img } from 'react-email';
import { EmailLayout } from './components/email-layout';
import { RaQuote } from './components/ra-quote';
import { EmailChartData } from '../lib/hd-chart/parse-for-email';
import { strategyVideoMG } from '../lib/hd-chart/constants';

interface Welcome1Props {
  firstName: string;
  chart: EmailChartData;
  unsubscribeUrl: string;
}

/**
 * Welcome Email 1: Career Type
 * Ported from fractalhumandesign/email/templates/welcome1.html
 * Copy is verbatim from the original template.
 */
export const Welcome1 = ({ firstName, chart, unsubscribeUrl }: Welcome1Props) => {
  return (
    <EmailLayout
      preview={`${firstName}, you are designed to be a ${chart.careerDesign}`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Heading
        as="h1"
        className="mt-0 text-[24px] font-bold text-left text-[#221B3D]"
      >
        Welcome, {firstName}!
      </Heading>

      <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
        We start with a look at the type of career which most aligns with your
        unique nature. Broadly speaking there are four different types of
        careers. None of them are more important than others, and each is
        critical to the process of creation.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
        Each career type has positive and more challenging aspects, based on
        their individual nonverbal energy. Since it is based on what is
        intrinsically you, rather than personal skills or preferences, it&apos;s
        more integral than the &quot;career guidance&quot; you might have
        received in high school. When working in alignment with your broad
        career type, you&apos;re more likely to feel in flow.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
        Unfortunately people try to be a type they are not. For example, the
        coaching industry (an Advisor-style career) has seen massive growth,
        leading some Builders (myself included) to try to teach others rather
        than looking to do what they love. Builders who do this are frequently
        frustrated. Meanwhile when Advisors, who don&apos;t have the same
        consistent level of energy as Builders do, try to keep up with Builders,
        they will tend to feel exhausted.
      </Text>

      <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
        Now that you have a general sense of the types, we can talk about you
        specifically:
      </Text>

      {/* Career type highlight box */}
      <Section className="mb-[21px] bg-[#F6F3FC] p-[16px]">
        <Text className="text-[16px]">
          <strong className="text-[#221B3D]">Career Type:</strong>
        </Text>
        <Text className="text-[#221B3D]">
          You are a{' '}
          <b>
            <em>{chart.careerDesign}</em>
          </b>
          , also known as a {chart.type}.
        </Text>
      </Section>

      {/* Type-specific copy */}
      <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
        {chart.isGenerator &&
          'You are designed to find your greatest pleasure in doing work that you love. You have a continually regenerated source of energy (this is why they are called Generators). A perfect day is to get up in the morning, spend the day creating what you love, and then come home and rest, feeling completely satisfied.'}
        {chart.isProjector &&
          'You are designed to help others to be successful. Your unique gift is to literally feel what the other person is feeling and then from that recognition, to advise them on the best ways to achieve their goals. Your design is made to do this on a one-on-one basis; if you find yourself attempting to advise groups, then the ideal interaction is still on a one-on-one basis.'}
        {chart.isManifestor &&
          "You are designed to be the launch pad for anything that you desire. Most entrepreneur books have you in mind for their ideal client: someone who can start with only an idea, find the people you need to make it happen, and then to go out and just get it started. Without you, we'd all be sitting around, waiting for someone to show up and tell us what to do."}
        {chart.isReflector &&
          'You have a very special purpose in the world: to take the pulse of everything going on and understand the health of the system. You might think of your talent as being like a canary in a coal mine: you can literally feel it in your body when things are harmonious and when they are discordant. Although you can feel everything that\'s going on, it tends not to affect you as much as it does other people; you have what is called "a teflon aura".'}
      </Text>

      {/* Ra Uru Hu quote */}
      <RaQuote>
        {chart.isGenerator &&
          "There's nothing more special on this planet than Generators ... there is no difference between finding a life and getting a job; you come into the world to find the right work. It is only once you've found the right work that you get a life."}
        {chart.isProjector &&
          "Everything about a Projector is that a Projector is here to guide, to guide. There's something very important to understand if you're a Projector. Probably the most important thing I can tell you only deal with one person at a time, one person at a time. ... You know, if you're a Projector and you got a family and you got a problem, don't do group therapy. Oh, let's all talk about it together, right? Oh, is that awful for you? You always end up the loser in that because you can only deal one being at a time."}
        {chart.isManifestor &&
          "You know, we're not warm, fuzzy people, Manifestors. It's not the way we work. Manifestors are designed simply to go out there and do their thing, period. And hopefully there are others that they drag along with them."}
        {chart.isReflector &&
          'I\'m always glad when Reflectors come into human design, because it\'s sort of like Neo and the Matrix. You know, the Reflector says, "Oh, we can pull this one out, because this one\'s really weird and different. It doesn\'t follow the rules. Maybe they\'ll be okay here.'}
      </RaQuote>

      {/* Not-self writeup */}
      <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
        {chart.isGenerator &&
          "Unfortunately, most Builders in the world have not found the work that they love to do. These people get up in the morning already exhausted, and do their best to avoid doing work. Most quiet quitters are frustrated Builders, because they don't see a way to get out of the system. If this is you, then Human Design will give you the tools to begin to break out of your rut and find a career which is satisfying."}
        {chart.isProjector &&
          'Advisors who are not living according to their design are like exhausted Builders, trying to keep up with people who have more energy than they do. These people are especially at risk of working themselves to exhaustion, until the point that their body just gives up on them. The phrase "not made to work" is meant for you, where "work" is the typical 9-5 job. If instead you focus on guiding the people who are right for you, you will be energized by each of them.'}
        {chart.isManifestor &&
          "You would think that with slogans like \"Just Do It\", the world would be perfect for someone like you. Well, not always. Because even though you are here to get things started, you're not here to do all the work; the Builders are here to do the work. Many Initiators get trapped in so much of the DOING that they burn out and aren't able to do the initiation that they're meant to do."}
        {chart.isReflector &&
          'Evaluators can feel like they are somehow different from everyone else. And at only 1% of the population, this is accurate! When not understanding their unique nature, you might continually try to fit in, or judge yourself because of a feeling of being invisible, but no matter what, always feel a bit separate. You might also sometimes feel like a victim, with so many different things happening to you. The trick is acceptance of your unique nature.'}
      </Text>

      {/* Type video link */}
      <Section className="mt-[8px]">
        <Link href={chart.typeVideo}>
          <Img
            src={chart.typeButtonGif}
            height={180}
            width={320}
            alt={`${chart.careerDesign} video`}
          />
          <Text>
            See more about being a {chart.careerDesign} in this video.
          </Text>
        </Link>
      </Section>

      {/* Career tip */}
      <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
        {chart.isGenerator &&
          "Doing what you love is super important. The world is full of burnt out Builders, slaving away doing what other people want them to do. Your energy is attractive to both people who want to utilize it for good or to take advantage of it for their own purposes. If you're doing what you love, amazing! If not, then start taking time to do what you love. Even if you're working a lot in a job you dislike, you might find that doing something as a side hustle can bring you even more energy rather than drain you even further!"}
        {chart.isProjector &&
          "Your path to success is to become an expert in a system. You might go to school to learn something you're interested in, or just play around with it for awhile until you become that expert. Share all of that knowledge with anyone who might be interested; social media is great for this. Take feedback and use it to get even better. The trick at the beginning stage is to worry less about making a profit and more about becoming an expert."}
        {chart.isManifestor &&
          "The beauty of being an Initiator is that you get to go first. While all of the other types are waiting: waiting for the moon, the others, the invitation; you wait for nothing and just do it. The downside is that you have to deal with all the rejection. Don't take it personally. Just because you initiate, it doesn't mean it will be right for them. So don't wait for others to come to you; be the one to invite others to things, and see how willing people are to be initiated."}
        {chart.isReflector &&
          "Your ideal career situation is to work in medium to large companies where you can get the vibe of the whole place. The phrase \"variety is the spice of life\" applies to you more than anyone else. Your accepting nature is a joy for others to be around, and so it's important to stay neutral and remain unattached when evaluating the group."}
      </Text>

      {/* Manifesting Generator addendum */}
      {chart.isManifestingGenerator && (
        <>
          <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
            BTW, many people are confused by what exactly is a
            &quot;Manifesting Generator&quot;, which is why we use
            &quot;Express Builder&quot; instead. Just to be clear:
          </Text>
          <Section className="ml-[32px]">
            <Text className="font-serif text-[16px] leading-[24px] text-[#221B3D] italic">
              [A] Manifesting Generator is a Generator with manifesting
              potential ... A Generator is a Generator is a Generator. It is
              about response. The power of the Manifesting Generator is the
              quality of energy that they can put to any task.
            </Text>
          </Section>
          <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
            The biggest difference in practice is that when building, Express
            Builders tend to skip steps while Classic Builders are more
            methodical.
          </Text>
          <Section className="mt-[8px]">
            <Link href={strategyVideoMG}>
              <Img
                src={chart.typeButtonGif}
                height={180}
                width={320}
                alt="Express Builder vs Classic Builder video"
              />
              <Text>
                Watch more about how an Express Builder differs from a Classic
                Builder.
              </Text>
            </Link>
          </Section>
        </>
      )}

      <Text className="mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]">
        That&apos;s it for today. Tomorrow you&apos;ll learn your personal way
        to make decisions that you can trust. See you then!
      </Text>
    </EmailLayout>
  );
};

// Preview props for React Email dev server
Welcome1.PreviewProps = {
  firstName: 'Shawn',
  chart: {
    type: 'Generator',
    isGenerator: true,
    isPureGenerator: true,
    isManifestingGenerator: false,
    isManifestor: false,
    isProjector: false,
    isReflector: false,
    careerDesign: '🔥 Classic Builder',
    strategy: 'wait to respond before engaging',
    innerAuthority: 'Emotional',
    innerAuthorityDescription: 'wait for emotional clarity',
    signatureTheme: 'satisfaction',
    notSelfTheme: 'frustration',
    signatureThemeAdjective: 'satisfied',
    notSelfThemeAdjective: 'frustrated',
    decisionMakingStrategy:
      'wait to respond before engaging, and then wait for emotional clarity',
    isEmotionalAuthority: true,
    typeVideo: 'https://youtu.be/9PVgkBzpPqs',
    typeButtonGif:
      'https://fractalhumandesign.s3.us-east-1.amazonaws.com/site/images/generator-button.gif',
    strategyVideo: 'https://youtu.be/_g3cx77EeLs',
    innerAuthorityVideo: 'https://youtu.be/e9g6q1pKJeo',
    signatureVideo: 'https://youtu.be/fHGRdJSyE34'
  },
  unsubscribeUrl: 'https://livecorrectly.com/api/unsubscribe?token=test'
} satisfies Welcome1Props;

export default Welcome1;
