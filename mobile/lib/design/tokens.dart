import 'package:flutter/material.dart';

/// Design tokens for Subtitle Notes.
///
/// The visual language is deliberately tactile: flat saturated colour, a solid
/// darker "lip" under every pressable surface instead of a blurred shadow, one
/// rounded type family, and a 4dp spacing rhythm. Nothing here uses gradients —
/// depth comes from the lip and from border weight, which is what keeps the
/// interface feeling built rather than generated.
class AppSpace {
  const AppSpace._();
  static const double xxs = 2;
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 20;
  static const double xxl = 24;
  static const double h1 = 32;
  static const double h2 = 40;

  /// Horizontal page gutter. Every screen uses this one value so vertical
  /// edges line up across the whole app.
  static const double gutter = 18;
}

class AppRadius {
  const AppRadius._();
  static const double chip = 999;
  static const double button = 16;
  static const double card = 20;
  static const double panel = 24;
  static const double sheet = 28;
  static const double small = 12;

  static const BorderRadius cardR = BorderRadius.all(Radius.circular(card));
  static const BorderRadius buttonR = BorderRadius.all(Radius.circular(button));
  static const BorderRadius panelR = BorderRadius.all(Radius.circular(panel));
}

/// Height of the solid 3D edge under pressable surfaces.
class AppLip {
  const AppLip._();
  static const double button = 4;
  static const double card = 3;
}

class AppMotion {
  const AppMotion._();
  static const Duration press = Duration(milliseconds: 90);
  static const Duration quick = Duration(milliseconds: 180);
  static const Duration normal = Duration(milliseconds: 260);
  static const Duration exit = Duration(milliseconds: 170);
  static const Curve enter = Curves.easeOutCubic;
  static const Curve leave = Curves.easeInCubic;
  static const Curve spring = Curves.easeOutBack;
}

/// Semantic colour set. Both themes define every token, so no component ever
/// needs a raw hex value or a `brightness ==` check.
@immutable
class AppColors extends ThemeExtension<AppColors> {
  const AppColors({
    required this.bg,
    required this.surface,
    required this.surfaceAlt,
    required this.line,
    required this.lip,
    required this.ink,
    required this.ink2,
    required this.ink3,
    required this.green,
    required this.greenLip,
    required this.greenBright,
    required this.greenWash,
    required this.onGreen,
    required this.blue,
    required this.blueLip,
    required this.blueWash,
    required this.onBlue,
    required this.amber,
    required this.amberLip,
    required this.amberWash,
    required this.onAmber,
    required this.red,
    required this.redLip,
    required this.redWash,
    required this.onRed,
    required this.purple,
    required this.purpleWash,
    required this.onPurple,
    required this.scrim,
  });

  final Color bg, surface, surfaceAlt, line, lip;
  final Color ink, ink2, ink3;
  final Color green, greenLip, greenBright, greenWash, onGreen;
  final Color blue, blueLip, blueWash, onBlue;
  final Color amber, amberLip, amberWash, onAmber;
  final Color red, redLip, redWash, onRed;
  final Color purple, purpleWash, onPurple;
  final Color scrim;

  /// Readable foreground for text sitting on one of the accent surfaces. The
  /// light theme can carry white on saturated colour; the dark theme uses much
  /// brighter accents, where near-black is the legible choice.
  Color onAccent(Color accent) {
    if (accent == green) return onGreen;
    if (accent == blue) return onBlue;
    if (accent == amber) return onAmber;
    if (accent == red) return onRed;
    if (accent == purple) return onPurple;
    return ink;
  }

  /// Stable per-source accent so every film or series keeps the same colour
  /// across sessions. Order matters less than determinism.
  Color accentFor(String seed) {
    const swatches = 5;
    var hash = 0;
    for (final unit in seed.codeUnits) {
      hash = (hash * 31 + unit) & 0x7fffffff;
    }
    switch (hash % swatches) {
      case 0:
        return green;
      case 1:
        return blue;
      case 2:
        return amber;
      case 3:
        return purple;
      default:
        return red;
    }
  }

  Color washFor(String seed) {
    final accent = accentFor(seed);
    if (accent == green) return greenWash;
    if (accent == blue) return blueWash;
    if (accent == amber) return amberWash;
    if (accent == purple) return purpleWash;
    return redWash;
  }

  static const light = AppColors(
    bg: Color(0xfff3f6f2),
    surface: Color(0xffffffff),
    surfaceAlt: Color(0xfffafbf8),
    line: Color(0xffe1e7de),
    lip: Color(0xffd2dacf),
    ink: Color(0xff20302a),
    ink2: Color(0xff63756d),
    ink3: Color(0xff93a29a),
    green: Color(0xff2ba84a),
    greenLip: Color(0xff1e7f36),
    greenBright: Color(0xff3ed16a),
    greenWash: Color(0xffe6f7ea),
    onGreen: Color(0xffffffff),
    blue: Color(0xff1f9be0),
    blueLip: Color(0xff1478b0),
    blueWash: Color(0xffe4f4fd),
    onBlue: Color(0xffffffff),
    amber: Color(0xfff2a20c),
    amberLip: Color(0xffc97f00),
    amberWash: Color(0xfffdf1da),
    onAmber: Color(0xff3a2b06),
    red: Color(0xffe8464b),
    redLip: Color(0xffc22f35),
    redWash: Color(0xfffdeaea),
    onRed: Color(0xffffffff),
    purple: Color(0xff8f5df0),
    purpleWash: Color(0xfff0e9fe),
    onPurple: Color(0xffffffff),
    scrim: Color(0x8a101a16),
  );

  static const dark = AppColors(
    bg: Color(0xff101a1e),
    surface: Color(0xff18262b),
    surfaceAlt: Color(0xff1e3038),
    line: Color(0xff2c4149),
    lip: Color(0xff0c161a),
    ink: Color(0xffeaf3f0),
    ink2: Color(0xff92a7ad),
    ink3: Color(0xff6b8188),
    green: Color(0xff35be58),
    greenLip: Color(0xff1d7c37),
    greenBright: Color(0xff4ddc72),
    greenWash: Color(0xff17342a),
    onGreen: Color(0xff081410),
    blue: Color(0xff35afef),
    blueLip: Color(0xff17739f),
    blueWash: Color(0xff11303f),
    onBlue: Color(0xff05161f),
    amber: Color(0xffffb932),
    amberLip: Color(0xffc07f00),
    amberWash: Color(0xff372a11),
    onAmber: Color(0xff241905),
    red: Color(0xffff5f63),
    redLip: Color(0xffb8353a),
    redWash: Color(0xff3a1e21),
    onRed: Color(0xff230809),
    purple: Color(0xffa87dff),
    purpleWash: Color(0xff2a2140),
    onPurple: Color(0xff150c28),
    scrim: Color(0xa6060d10),
  );

  @override
  AppColors copyWith() => this;

  @override
  AppColors lerp(ThemeExtension<AppColors>? other, double t) {
    if (other is! AppColors) return this;
    Color mix(Color a, Color b) => Color.lerp(a, b, t)!;
    return AppColors(
      bg: mix(bg, other.bg),
      surface: mix(surface, other.surface),
      surfaceAlt: mix(surfaceAlt, other.surfaceAlt),
      line: mix(line, other.line),
      lip: mix(lip, other.lip),
      ink: mix(ink, other.ink),
      ink2: mix(ink2, other.ink2),
      ink3: mix(ink3, other.ink3),
      green: mix(green, other.green),
      greenLip: mix(greenLip, other.greenLip),
      greenBright: mix(greenBright, other.greenBright),
      greenWash: mix(greenWash, other.greenWash),
      onGreen: mix(onGreen, other.onGreen),
      blue: mix(blue, other.blue),
      blueLip: mix(blueLip, other.blueLip),
      blueWash: mix(blueWash, other.blueWash),
      onBlue: mix(onBlue, other.onBlue),
      amber: mix(amber, other.amber),
      amberLip: mix(amberLip, other.amberLip),
      amberWash: mix(amberWash, other.amberWash),
      onAmber: mix(onAmber, other.onAmber),
      red: mix(red, other.red),
      redLip: mix(redLip, other.redLip),
      redWash: mix(redWash, other.redWash),
      onRed: mix(onRed, other.onRed),
      purple: mix(purple, other.purple),
      purpleWash: mix(purpleWash, other.purpleWash),
      onPurple: mix(onPurple, other.onPurple),
      scrim: mix(scrim, other.scrim),
    );
  }
}

extension AppColorsContext on BuildContext {
  AppColors get c => Theme.of(this).extension<AppColors>() ?? AppColors.light;
}

/// Nunito is a variable font, so the weight axis is set explicitly. Passing
/// only `fontWeight` would leave every label at the default instance on some
/// engines, which is exactly the kind of flatness that makes type look cheap.
TextStyle font({
  required double size,
  double weight = 700,
  Color? color,
  double height = 1.25,
  double letterSpacing = 0,
  bool tabular = false,
  bool italic = false,
}) => TextStyle(
  fontFamily: 'Nunito',
  fontSize: size,
  height: height,
  color: color,
  letterSpacing: letterSpacing,
  fontStyle: italic ? FontStyle.italic : FontStyle.normal,
  fontWeight: _nearestWeight(weight),
  fontVariations: [FontVariation('wght', weight)],
  // Counters line up in stat tiles and timecodes instead of jittering as the
  // numbers change.
  fontFeatures: tabular ? const [FontFeature.tabularFigures()] : null,
);

FontWeight _nearestWeight(double weight) {
  final index = ((weight / 100).round() - 1).clamp(0, 8);
  return FontWeight.values[index];
}

/// The type scale. Sizes step 12 / 13 / 15 / 17 / 20 / 24 / 30 / 38 — no
/// arbitrary values anywhere else in the app.
class AppText {
  const AppText._();

  static TextStyle display(Color color) =>
      font(size: 38, weight: 900, color: color, height: 1.08, letterSpacing: -1);
  static TextStyle title(Color color) =>
      font(size: 30, weight: 900, color: color, height: 1.12, letterSpacing: -.7);
  static TextStyle heading(Color color) =>
      font(size: 24, weight: 800, color: color, height: 1.18, letterSpacing: -.4);
  static TextStyle word(Color color) =>
      font(size: 20, weight: 800, color: color, height: 1.2, letterSpacing: -.2);
  static TextStyle body(Color color) =>
      font(size: 17, weight: 600, color: color, height: 1.45);
  static TextStyle bodySoft(Color color) =>
      font(size: 15, weight: 600, color: color, height: 1.5);
  static TextStyle label(Color color) =>
      font(size: 13, weight: 800, color: color, height: 1.3);
  static TextStyle caption(Color color) =>
      font(size: 12, weight: 700, color: color, height: 1.35, letterSpacing: .1);
  static TextStyle button(Color color) =>
      font(size: 18, weight: 800, color: color, height: 1.1, letterSpacing: .1);
}

ThemeData buildTheme(AppColors colors, Brightness brightness) {
  final base = ThemeData(brightness: brightness, useMaterial3: true);
  return base.copyWith(
    extensions: [colors],
    scaffoldBackgroundColor: colors.bg,
    canvasColor: colors.bg,
    splashFactory: InkSparkle.splashFactory,
    colorScheme: ColorScheme.fromSeed(
      seedColor: colors.green,
      brightness: brightness,
    ).copyWith(
      primary: colors.green,
      onPrimary: colors.onGreen,
      surface: colors.surface,
      onSurface: colors.ink,
      error: colors.red,
      onError: colors.onRed,
    ),
    textTheme: base.textTheme.apply(fontFamily: 'Nunito').copyWith(
      bodyLarge: AppText.body(colors.ink),
      bodyMedium: AppText.bodySoft(colors.ink),
      titleLarge: AppText.heading(colors.ink),
      labelLarge: AppText.label(colors.ink),
    ),
    iconTheme: IconThemeData(color: colors.ink2, size: 24),
    dividerTheme: DividerThemeData(color: colors.line, thickness: 1.5, space: 1.5),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: colors.ink,
      contentTextStyle: AppText.bodySoft(colors.surface),
      insetPadding: const EdgeInsets.fromLTRB(
        AppSpace.gutter,
        0,
        AppSpace.gutter,
        AppSpace.lg,
      ),
      shape: const RoundedRectangleBorder(borderRadius: AppRadius.buttonR),
      elevation: 0,
    ),
    tooltipTheme: TooltipThemeData(
      decoration: BoxDecoration(
        color: colors.ink,
        borderRadius: BorderRadius.circular(AppRadius.small),
      ),
      textStyle: AppText.caption(colors.surface),
    ),
    progressIndicatorTheme: ProgressIndicatorThemeData(
      color: colors.green,
      circularTrackColor: colors.line,
      strokeWidth: 3.5,
      strokeCap: StrokeCap.round,
    ),
  );
}
