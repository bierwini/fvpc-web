import { IntroScreen } from './screens/IntroScreen';
import { MatchScreen } from './screens/MatchScreen';
import { RankingScreen } from './screens/RankingScreen';
import { UploadScreen } from './screens/UploadScreen';
import { useTournament } from './tournament/useTournament';

export function App() {
  const { state, currentMatch, ranking, shuffleEnabled, actions } = useTournament();

  switch (state.view) {
    case 'intro':
      return <IntroScreen onStart={actions.goToUpload} />;

    case 'upload':
      return (
        <UploadScreen
          images={state.imageOrder.map((id) => state.images[id]!)}
          shuffleEnabled={shuffleEnabled}
          onShuffleChange={actions.setShuffleEnabled}
          onAddFiles={actions.addFiles}
          onRemoveImage={actions.removeImage}
          onBack={actions.goToIntro}
          onStart={actions.startTournament}
        />
      );

    case 'match':
      return currentMatch ? (
        <MatchScreen
          match={currentMatch}
          nextMatch={state.matchQueue[1] ?? null}
          images={state.images}
          completedMatches={state.completedMatches}
          totalMatches={state.totalMatches}
          onChoose={actions.pickWinner}
          onRemove={actions.excludeCurrentImage}
          onClose={actions.resetTournament}
        />
      ) : null;

    case 'ranking':
      return (
        <RankingScreen
          ranking={ranking}
          images={state.images}
          onClose={actions.resetTournament}
          onNextGame={actions.startNewTournament}
        />
      );
  }
}
