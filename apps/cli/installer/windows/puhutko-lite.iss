#ifndef AppVersion
#define AppVersion "0.0.0"
#endif

[Setup]
AppId={{E8DDBBFC-BCB2-4263-A1C9-F3DCCA267E8A}
AppName=Puhutko Lite
AppVersion={#AppVersion}
AppPublisher=Puhutko Lite
DefaultDirName={localappdata}\Programs\PuhutkoLite
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
OutputBaseFilename=PuhutkoLite-Setup
Compression=lzma
SolidCompression=yes
WizardStyle=modern
ChangesEnvironment=yes
UninstallDisplayIcon={app}\puhutko-lite.exe

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Additional shortcuts:"; Flags: unchecked
Name: "startmenuicon"; Description: "Create a Start Menu shortcut"; GroupDescription: "Additional shortcuts:"; Flags: unchecked

[Files]
Source: "..\..\dist\puhutko-lite.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\Puhutko Lite"; Filename: "{app}\puhutko-lite.exe"; Tasks: startmenuicon
Name: "{autodesktop}\Puhutko Lite"; Filename: "{app}\puhutko-lite.exe"; Tasks: desktopicon

[Registry]
Root: HKCU; Subkey: "Environment"; ValueType: expandsz; ValueName: "Path"; ValueData: "{olddata};{app}"; Check: NeedsAddPath(ExpandConstant('{app}'))

[Run]
Filename: "{app}\puhutko-lite.exe"; Description: "Run Puhutko Lite"; Flags: nowait postinstall skipifsilent unchecked

[Code]
function NeedsAddPath(Param: string): Boolean;
var
  OrigPath: string;
begin
  if not RegQueryStringValue(HKCU, 'Environment', 'Path', OrigPath) then
  begin
    Result := True;
    Exit;
  end;

  Result := Pos(';' + Uppercase(Param) + ';', ';' + Uppercase(OrigPath) + ';') = 0;
end;

procedure RemovePath(PathValue: string);
var
  OrigPath: string;
  SearchPath: string;
  SearchOrigPath: string;
  NewPath: string;
  StartPos: Integer;
  EndPos: Integer;
begin
  if not RegQueryStringValue(HKCU, 'Environment', 'Path', OrigPath) then
    Exit;

  SearchPath := ';' + Uppercase(PathValue) + ';';
  SearchOrigPath := ';' + Uppercase(OrigPath) + ';';
  StartPos := Pos(SearchPath, SearchOrigPath);

  if StartPos = 0 then
    Exit;

  EndPos := StartPos + Length(SearchPath) - 1;
  NewPath := Copy(OrigPath, 1, StartPos - 1) + Copy(OrigPath, EndPos + 1, MaxInt);

  while (Length(NewPath) > 0) and (NewPath[1] = ';') do
    Delete(NewPath, 1, 1);
  while (Length(NewPath) > 0) and (NewPath[Length(NewPath)] = ';') do
    Delete(NewPath, Length(NewPath), 1);

  RegWriteExpandStringValue(HKCU, 'Environment', 'Path', NewPath);
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usUninstall then
    RemovePath(ExpandConstant('{app}'));
end;
