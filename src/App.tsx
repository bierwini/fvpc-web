import { IntroScreen } from './screens/IntroScreen';
import { MatchScreen } from './screens/MatchScreen';
import { RankingScreen } from './screens/RankingScreen';
import { UploadScreen } from './screens/UploadScreen';
import { getUpcomingImageIds } from './tournament/engine';
import { useTournament } from './tournament/useTournament';
import { useUnloadWarning } from './tournament/useUnloadWarning';

export function App() {
  const { state, currentMatch, ranking, shuffleEnabled, actions } = useTournament();

  // Warnung nur, wenn Bilder geladen sind oder ein Turnier/Ranking läuft (sonst geht nichts verloren).
  useUnloadWarning(state.imageOrder.length > 0 || state.view === 'match' || state.view === 'ranking');

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
          onBack={actions.resetTournament}
          onStart={actions.startTournament}
        />
      );

    case 'match':
      return currentMatch ? (
        <MatchScreen
          match={currentMatch}
          preloadIds={getUpcomingImageIds(state)}
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
