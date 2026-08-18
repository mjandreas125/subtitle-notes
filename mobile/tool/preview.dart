// Design harness. Not part of the shipped app: it renders the phone screens
// at handset size on a desktop window so layout and spacing can be reviewed
// without a device attached.
//
//   flutter run -d windows -t tool/preview.dart

import 'package:flutter/material.dart';
import 'package:translated_vlc_mobile/data.dart';
import 'package:translated_vlc_mobile/design/tokens.dart';
import 'package:translated_vlc_mobile/screens/games.dart';
import 'package:translated_vlc_mobile/screens/nickname_sheet.dart';

void main() => runApp(const PreviewApp());

StudyCard _card(String word, String meaning, String line, String source) =>
    StudyCard(
      id: word,
      mediaTitle: source,
      season: '2',
      episode: '8',
      timecodeMs: 123000,
      selectedText: line,
      translation: meaning,
      focusWord: word.split(' ').first,
      focusPhrase: word,
      focusTranslation: meaning,
      synonyms: const [],
      senseNote: null,
      archived: false,
      createdAt: DateTime.now(),
    );

final _cards = [
  _card('bias', 'предвзятость', 'Or will it bias the jury against us?', '13 Reasons Why'),
  _card('reluctant to', 'неохотно', 'She was reluctant to admit it', 'Dark'),
  _card('brag about', 'хвастаться', 'He keeps bragging about his new car', 'The Bear'),
  _card('trifle', 'мелочь', "She's a trifle late again", '13 Reasons Why'),
  _card('chanting', 'повторять', 'I am chanting the right words', 'Dune'),
  _card('explicitly', 'явно', 'He said it explicitly', 'Dark'),
];

class PreviewApp extends StatelessWidget {
  const PreviewApp({super.key});

  @override
  Widget build(BuildContext context) => MaterialApp(
    debugShowCheckedModeBanner: false,
    theme: buildTheme(AppColors.light, Brightness.light),
    darkTheme: buildTheme(AppColors.dark, Brightness.dark),
    home: const _Gallery(),
  );
}

class _Gallery extends StatelessWidget {
  const _Gallery();

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Scaffold(
      backgroundColor: c.surfaceAlt,
      body: Center(
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _Phone(label: 'Practice', child: GamesTab(cards: _cards)),
            const SizedBox(width: 28),
            _Phone(
              label: 'Match the pairs',
              child: MatchGamePage(cards: _cards),
            ),
            const SizedBox(width: 28),
            _Phone(
              label: 'Fill the line',
              child: ClozeGamePage(cards: _cards, distractors: _cards),
            ),
            const SizedBox(width: 28),
            _Phone(
              label: 'Nickname',
              child: Stack(
                children: [
                  const ColoredBox(color: Color(0x00000000), child: SizedBox.expand()),
                  NicknameSheet(
                    api: SyncApi(const Session(baseUrl: '', token: '', email: 'a@b.c')),
                    profile: const Profile(
                      id: '1',
                      email: 'andreas.sultseng228@gmail.com',
                      displayName: 'Andreas Sultseng',
                      nickname: null,
                      shareFeed: true,
                      friendCount: 0,
                      followerCount: 0,
                      language: 'ru',
                    ),
                    firstTime: true,
                    onSaved: (_) {},
                    onClose: () {},
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Phone extends StatelessWidget {
  const _Phone({required this.label, required this.child});

  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(label, style: AppText.label(c.ink2)),
        const SizedBox(height: 8),
        Container(
          height: 720,
          width: 360,
          decoration: BoxDecoration(
            border: Border.all(color: c.line, width: 2),
            borderRadius: BorderRadius.circular(28),
          ),
          clipBehavior: Clip.antiAlias,
          child: MediaQuery(
            data: const MediaQueryData(size: Size(360, 720)),
            child: child,
          ),
        ),
      ],
    );
  }
}
