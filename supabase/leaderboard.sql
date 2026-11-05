-- Anatomeme optional global leaderboard. Run AFTER supabase/setup.sql.
-- Re-running retains enrollment and awards; it refreshes the official catalog
-- and rebuilds score totals from bounded, unique earned targets.
begin;

-- Keep the first backfill and new-event trigger consistent with concurrent sync.
lock table public.study_events in share row exclusive mode;

create schema if not exists leaderboard_private;
revoke all on schema leaderboard_private from public, anon, authenticated;

create table if not exists leaderboard_private.questions (
  question_id text primary key,
  collection text not null check (collection in ('muscles', 'skeleton', 'landmarks'))
);
create table if not exists leaderboard_private.earned_targets (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null references leaderboard_private.questions(question_id),
  primary key (user_id, question_id)
);
create table if not exists leaderboard_private.scores (
  user_id uuid primary key references auth.users(id) on delete cascade,
  score integer not null check (score >= 0)
);
create table if not exists leaderboard_private.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null check (
    nickname = btrim(nickname)
    and nickname ~ '^[A-Za-z0-9 _-]{3,24}$'
    and nickname ~ '[A-Za-z0-9]'
  ),
  listed boolean not null default false
);
create unique index if not exists leaderboard_nickname_unique
  on leaderboard_private.profiles (lower(nickname));

-- Defense in depth: these tables are never in the public API. Only the narrow
-- SECURITY DEFINER functions below can read/write them on a caller's behalf.
alter table leaderboard_private.questions enable row level security;
alter table leaderboard_private.earned_targets enable row level security;
alter table leaderboard_private.scores enable row level security;
alter table leaderboard_private.profiles enable row level security;
revoke all on all tables in schema leaderboard_private from public, anon, authenticated;

-- Generated from src/modelQuiz.ts modelPromptPools: 462 muscle, 238 skeletal,
-- and 20 landmark/side IDs. Exact IDs (not a prefix match) bound each score.
-- Catalog IDs are additive across reruns so past legitimate awards survive.
insert into leaderboard_private.questions (question_id, collection) values
  ('model-muscles-FJ1419', 'muscles'),
  ('model-muscles-ZA_M_188008333', 'muscles'),
  ('model-muscles-FJ1419M', 'muscles'),
  ('model-muscles-FJ1418M', 'muscles'),
  ('model-muscles-ZA_M_481864979', 'muscles'),
  ('model-muscles-ZA_M_625532537', 'muscles'),
  ('model-muscles-FJ1418', 'muscles'),
  ('model-muscles-ZA_M_965185828', 'muscles'),
  ('model-muscles-ZA_M_65307038', 'muscles'),
  ('model-muscles-ZA_M_71171280', 'muscles'),
  ('model-muscles-ZA_M_120752132', 'muscles'),
  ('model-muscles-FJ1439M', 'muscles'),
  ('model-muscles-FJ1439', 'muscles'),
  ('model-muscles-ZA_M_542055860', 'muscles'),
  ('model-muscles-ZA_M_590627815', 'muscles'),
  ('model-muscles-ZA_M_891301055', 'muscles'),
  ('model-muscles-ZA_M_7783512', 'muscles'),
  ('model-muscles-ZA_M_31511368', 'muscles'),
  ('model-muscles-ZA_M_273036888', 'muscles'),
  ('model-muscles-ZA_M_402550054', 'muscles'),
  ('model-muscles-ZA_M_600174712', 'muscles'),
  ('model-muscles-ZA_M_767779129', 'muscles'),
  ('model-muscles-ZA_M_38458573', 'muscles'),
  ('model-muscles-ZA_M_88110804', 'muscles'),
  ('model-muscles-ZA_M_90310087', 'muscles'),
  ('model-muscles-ZA_M_120138617', 'muscles'),
  ('model-muscles-ZA_M_126486897', 'muscles'),
  ('model-muscles-ZA_M_166334464', 'muscles'),
  ('model-muscles-ZA_M_190317272', 'muscles'),
  ('model-muscles-ZA_M_323490698', 'muscles'),
  ('model-muscles-ZA_M_310107551', 'muscles'),
  ('model-muscles-ZA_M_427011351', 'muscles'),
  ('model-muscles-ZA_M_529220062', 'muscles'),
  ('model-muscles-ZA_M_889267559', 'muscles'),
  ('model-muscles-ZA_M_352636945', 'muscles'),
  ('model-muscles-ZA_M_438715331', 'muscles'),
  ('model-muscles-ZA_M_468794132', 'muscles'),
  ('model-muscles-ZA_M_537307938', 'muscles'),
  ('model-muscles-ZA_M_617788595', 'muscles'),
  ('model-muscles-ZA_M_624724133', 'muscles'),
  ('model-muscles-ZA_M_660006931', 'muscles'),
  ('model-muscles-ZA_M_710749971', 'muscles'),
  ('model-muscles-ZA_M_732116709', 'muscles'),
  ('model-muscles-ZA_M_825861524', 'muscles'),
  ('model-muscles-ZA_M_899759535', 'muscles'),
  ('model-muscles-ZA_M_975515398', 'muscles'),
  ('model-muscles-ZA_M_46522600', 'muscles'),
  ('model-muscles-ZA_M_77443959', 'muscles'),
  ('model-muscles-ZA_M_137107048', 'muscles'),
  ('model-muscles-ZA_M_220313230', 'muscles'),
  ('model-muscles-ZA_M_330216915', 'muscles'),
  ('model-muscles-ZA_M_375268405', 'muscles'),
  ('model-muscles-ZA_M_374639111', 'muscles'),
  ('model-muscles-ZA_M_530208388', 'muscles'),
  ('model-muscles-ZA_M_574285216', 'muscles'),
  ('model-muscles-ZA_M_610284590', 'muscles'),
  ('model-muscles-ZA_M_942819798', 'muscles'),
  ('model-muscles-ZA_M_944732284', 'muscles'),
  ('model-muscles-ZA_M_986487575', 'muscles'),
  ('model-muscles-ZA_M_281840938', 'muscles'),
  ('model-muscles-ZA_M_58135279', 'muscles'),
  ('model-muscles-ZA_M_144360526', 'muscles'),
  ('model-muscles-ZA_M_235597193', 'muscles'),
  ('model-muscles-ZA_M_383217244', 'muscles'),
  ('model-muscles-FJ1444M', 'muscles'),
  ('model-muscles-FJ1436', 'muscles'),
  ('model-muscles-FJ1444', 'muscles'),
  ('model-muscles-FJ1435', 'muscles'),
  ('model-muscles-FJ1395M', 'muscles'),
  ('model-muscles-FJ1436M', 'muscles'),
  ('model-muscles-FJ1435M', 'muscles'),
  ('model-muscles-FJ1395', 'muscles'),
  ('model-muscles-FJ1394M', 'muscles'),
  ('model-muscles-FJ1437M', 'muscles'),
  ('model-muscles-ZA_M_506382866', 'muscles'),
  ('model-muscles-FJ1394', 'muscles'),
  ('model-muscles-FJ1397M', 'muscles'),
  ('model-muscles-FJ1397', 'muscles'),
  ('model-muscles-FJ1437', 'muscles'),
  ('model-muscles-ZA_M_988126069', 'muscles'),
  ('model-muscles-ZA_M_115201106', 'muscles'),
  ('model-muscles-ZA_M_313839623', 'muscles'),
  ('model-muscles-ZA_M_498927038', 'muscles'),
  ('model-muscles-ZA_M_622768040', 'muscles'),
  ('model-muscles-ZA_M_632232163', 'muscles'),
  ('model-muscles-ZA_M_817962400', 'muscles'),
  ('model-muscles-ZA_M_917182063', 'muscles'),
  ('model-muscles-ZA_M_920250022', 'muscles'),
  ('model-muscles-ZA_M_176848128', 'muscles'),
  ('model-muscles-ZA_M_315870314', 'muscles'),
  ('model-muscles-ZA_M_373437200', 'muscles'),
  ('model-muscles-ZA_M_416362594', 'muscles'),
  ('model-muscles-ZA_M_464622025', 'muscles'),
  ('model-muscles-ZA_M_513223513', 'muscles'),
  ('model-muscles-ZA_M_665958576', 'muscles'),
  ('model-muscles-ZA_M_726753845', 'muscles'),
  ('model-muscles-ZA_M_867718655', 'muscles'),
  ('model-muscles-ZA_M_919705750', 'muscles'),
  ('model-muscles-FJ1443M', 'muscles'),
  ('model-muscles-FJ1442', 'muscles'),
  ('model-muscles-FJ1443', 'muscles'),
  ('model-muscles-FJ1434', 'muscles'),
  ('model-muscles-FJ1433', 'muscles'),
  ('model-muscles-ZA_M_803032127', 'muscles'),
  ('model-muscles-FJ1434M', 'muscles'),
  ('model-muscles-ZA_M_916015942', 'muscles'),
  ('model-muscles-FJ1433M', 'muscles'),
  ('model-muscles-FJ1442M', 'muscles'),
  ('model-muscles-ZA_M_127513549', 'muscles'),
  ('model-muscles-ZA_M_243722661', 'muscles'),
  ('model-muscles-ZA_M_486248492', 'muscles'),
  ('model-muscles-ZA_M_888473793', 'muscles'),
  ('model-muscles-ZA_M_271800663', 'muscles'),
  ('model-muscles-ZA_M_455359935', 'muscles'),
  ('model-muscles-ZA_M_702231470', 'muscles'),
  ('model-muscles-ZA_M_800802465', 'muscles'),
  ('model-muscles-ZA_M_793318402', 'muscles'),
  ('model-muscles-ZA_M_995862335', 'muscles'),
  ('model-muscles-ZA_M_131002877', 'muscles'),
  ('model-muscles-ZA_M_181104823', 'muscles'),
  ('model-muscles-ZA_M_203921301', 'muscles'),
  ('model-muscles-ZA_M_509132682', 'muscles'),
  ('model-muscles-ZA_M_517073369', 'muscles'),
  ('model-muscles-ZA_M_837312177', 'muscles'),
  ('model-muscles-ZA_M_23602413', 'muscles'),
  ('model-muscles-ZA_M_46005575', 'muscles'),
  ('model-muscles-ZA_M_63420266', 'muscles'),
  ('model-muscles-ZA_M_114442261', 'muscles'),
  ('model-muscles-ZA_M_121742891', 'muscles'),
  ('model-muscles-ZA_M_200305276', 'muscles'),
  ('model-muscles-ZA_M_247885239', 'muscles'),
  ('model-muscles-ZA_M_290510213', 'muscles'),
  ('model-muscles-ZA_M_381066825', 'muscles'),
  ('model-muscles-ZA_M_412064368', 'muscles'),
  ('model-muscles-ZA_M_415043050', 'muscles'),
  ('model-muscles-ZA_M_434537092', 'muscles'),
  ('model-muscles-ZA_M_434972166', 'muscles'),
  ('model-muscles-ZA_M_489981318', 'muscles'),
  ('model-muscles-ZA_M_495262934', 'muscles'),
  ('model-muscles-ZA_M_510329294', 'muscles'),
  ('model-muscles-ZA_M_646475330', 'muscles'),
  ('model-muscles-ZA_M_662526822', 'muscles'),
  ('model-muscles-ZA_M_667750948', 'muscles'),
  ('model-muscles-ZA_M_726335290', 'muscles'),
  ('model-muscles-ZA_M_763323912', 'muscles'),
  ('model-muscles-ZA_M_783619419', 'muscles'),
  ('model-muscles-ZA_M_796791312', 'muscles'),
  ('model-muscles-ZA_M_814845954', 'muscles'),
  ('model-muscles-ZA_M_826115562', 'muscles'),
  ('model-muscles-ZA_M_833854523', 'muscles'),
  ('model-muscles-ZA_M_843119347', 'muscles'),
  ('model-muscles-ZA_M_890613983', 'muscles'),
  ('model-muscles-ZA_M_897633611', 'muscles'),
  ('model-muscles-ZA_M_907127900', 'muscles'),
  ('model-muscles-ZA_M_926940655', 'muscles'),
  ('model-muscles-ZA_M_957288105', 'muscles'),
  ('model-muscles-ZA_M_977642170', 'muscles'),
  ('model-muscles-ZA_M_998988858', 'muscles'),
  ('model-muscles-ZA_M_162944253', 'muscles'),
  ('model-muscles-ZA_M_268652398', 'muscles'),
  ('model-muscles-ZA_M_312701766', 'muscles'),
  ('model-muscles-ZA_M_331223255', 'muscles'),
  ('model-muscles-ZA_M_336574972', 'muscles'),
  ('model-muscles-ZA_M_533962729', 'muscles'),
  ('model-muscles-ZA_M_695240571', 'muscles'),
  ('model-muscles-ZA_M_825659527', 'muscles'),
  ('model-muscles-ZA_M_826208578', 'muscles'),
  ('model-muscles-ZA_M_871676841', 'muscles'),
  ('model-muscles-ZA_M_907972935', 'muscles'),
  ('model-muscles-ZA_M_952924065', 'muscles'),
  ('model-muscles-ZA_M_101726543', 'muscles'),
  ('model-muscles-ZA_M_159234429', 'muscles'),
  ('model-muscles-ZA_M_229987069', 'muscles'),
  ('model-muscles-ZA_M_314842125', 'muscles'),
  ('model-muscles-ZA_M_333826502', 'muscles'),
  ('model-muscles-ZA_M_409257848', 'muscles'),
  ('model-muscles-ZA_M_501299842', 'muscles'),
  ('model-muscles-ZA_M_686772276', 'muscles'),
  ('model-muscles-ZA_M_804120105', 'muscles'),
  ('model-muscles-ZA_M_892995493', 'muscles'),
  ('model-muscles-ZA_M_895512714', 'muscles'),
  ('model-muscles-ZA_M_916854433', 'muscles'),
  ('model-muscles-ZA_M_976579572', 'muscles'),
  ('model-muscles-ZA_M_988656211', 'muscles'),
  ('model-muscles-ZA_M_61250749', 'muscles'),
  ('model-muscles-ZA_M_132298958', 'muscles'),
  ('model-muscles-ZA_M_78079918', 'muscles'),
  ('model-muscles-ZA_M_159798982', 'muscles'),
  ('model-muscles-ZA_M_419785171', 'muscles'),
  ('model-muscles-ZA_M_441806771', 'muscles'),
  ('model-muscles-ZA_M_537355208', 'muscles'),
  ('model-muscles-ZA_M_968157083', 'muscles'),
  ('model-muscles-ZA_M_493960696', 'muscles'),
  ('model-muscles-ZA_M_542697171', 'muscles'),
  ('model-muscles-ZA_M_76407795', 'muscles'),
  ('model-muscles-ZA_M_118649426', 'muscles'),
  ('model-muscles-ZA_M_231983401', 'muscles'),
  ('model-muscles-ZA_M_406437571', 'muscles'),
  ('model-muscles-ZA_M_440627230', 'muscles'),
  ('model-muscles-ZA_M_743982480', 'muscles'),
  ('model-muscles-ZA_M_888886461', 'muscles'),
  ('model-muscles-ZA_M_897381750', 'muscles'),
  ('model-muscles-ZA_M_98304661', 'muscles'),
  ('model-muscles-ZA_M_102426281', 'muscles'),
  ('model-muscles-ZA_M_112480232', 'muscles'),
  ('model-muscles-ZA_M_150283196', 'muscles'),
  ('model-muscles-ZA_M_725269361', 'muscles'),
  ('model-muscles-ZA_M_795494428', 'muscles'),
  ('model-muscles-ZA_M_121672055', 'muscles'),
  ('model-muscles-ZA_M_431527464', 'muscles'),
  ('model-muscles-ZA_M_486600975', 'muscles'),
  ('model-muscles-ZA_M_610823922', 'muscles'),
  ('model-muscles-ZA_M_766363035', 'muscles'),
  ('model-muscles-ZA_M_785419479', 'muscles'),
  ('model-muscles-ZA_M_203448079', 'muscles'),
  ('model-muscles-ZA_M_217550395', 'muscles'),
  ('model-muscles-ZA_M_346152219', 'muscles'),
  ('model-muscles-ZA_M_425011185', 'muscles'),
  ('model-muscles-ZA_M_484990941', 'muscles'),
  ('model-muscles-ZA_M_771811734', 'muscles'),
  ('model-muscles-ZA_M_328187069', 'muscles'),
  ('model-muscles-ZA_M_970255943', 'muscles'),
  ('model-muscles-ZA_M_48389147', 'muscles'),
  ('model-muscles-ZA_M_75706987', 'muscles'),
  ('model-muscles-ZA_M_405844393', 'muscles'),
  ('model-muscles-ZA_M_970731401', 'muscles'),
  ('model-muscles-ZA_M_583719552', 'muscles'),
  ('model-muscles-ZA_M_664161976', 'muscles'),
  ('model-muscles-ZA_M_734299209', 'muscles'),
  ('model-muscles-ZA_M_889284943', 'muscles'),
  ('model-muscles-ZA_M_926117341', 'muscles'),
  ('model-muscles-ZA_M_968572887', 'muscles'),
  ('model-muscles-ZA_M_9668625', 'muscles'),
  ('model-muscles-ZA_M_174931802', 'muscles'),
  ('model-muscles-ZA_M_187317367', 'muscles'),
  ('model-muscles-ZA_M_407595427', 'muscles'),
  ('model-muscles-ZA_M_650722884', 'muscles'),
  ('model-muscles-ZA_M_832789205', 'muscles'),
  ('model-muscles-ZA_M_179377326', 'muscles'),
  ('model-muscles-ZA_M_282715512', 'muscles'),
  ('model-muscles-ZA_M_358453148', 'muscles'),
  ('model-muscles-ZA_M_541710082', 'muscles'),
  ('model-muscles-ZA_M_52138261', 'muscles'),
  ('model-muscles-ZA_M_142313545', 'muscles'),
  ('model-muscles-ZA_M_172472462', 'muscles'),
  ('model-muscles-ZA_M_208168812', 'muscles'),
  ('model-muscles-ZA_M_214076779', 'muscles'),
  ('model-muscles-ZA_M_309857321', 'muscles'),
  ('model-muscles-ZA_M_457778667', 'muscles'),
  ('model-muscles-FJ1554', 'muscles'),
  ('model-muscles-FJ1520', 'muscles'),
  ('model-muscles-FJ1520M', 'muscles'),
  ('model-muscles-FJ1554M', 'muscles'),
  ('model-muscles-FJ1521', 'muscles'),
  ('model-muscles-FJ1521M', 'muscles'),
  ('model-muscles-ZA_M_670174335', 'muscles'),
  ('model-muscles-ZA_M_817053160', 'muscles'),
  ('model-muscles-ZA_M_829726023', 'muscles'),
  ('model-muscles-ZA_M_844541953', 'muscles'),
  ('model-muscles-ZA_M_943771781', 'muscles'),
  ('model-muscles-ZA_M_955662589', 'muscles'),
  ('model-muscles-ZA_M_956838160', 'muscles'),
  ('model-muscles-ZA_M_956874926', 'muscles'),
  ('model-muscles-ZA_M_993392113', 'muscles'),
  ('model-muscles-FJ1486', 'muscles'),
  ('model-muscles-FJ1486M', 'muscles'),
  ('model-muscles-FJ1512', 'muscles'),
  ('model-muscles-FJ1478', 'muscles'),
  ('model-muscles-FJ1478M', 'muscles'),
  ('model-muscles-FJ1512M', 'muscles'),
  ('model-muscles-ZA_M_656982723', 'muscles'),
  ('model-muscles-ZA_M_827936457', 'muscles'),
  ('model-muscles-ZA_M_130797506', 'muscles'),
  ('model-muscles-ZA_M_189772909', 'muscles'),
  ('model-muscles-ZA_M_400633043', 'muscles'),
  ('model-muscles-ZA_M_809095169', 'muscles'),
  ('model-muscles-ZA_M_810748658', 'muscles'),
  ('model-muscles-ZA_M_916369669', 'muscles'),
  ('model-muscles-ZA_M_36958809', 'muscles'),
  ('model-muscles-ZA_M_118551750', 'muscles'),
  ('model-muscles-ZA_M_134916069', 'muscles'),
  ('model-muscles-ZA_M_277369719', 'muscles'),
  ('model-muscles-ZA_M_323185919', 'muscles'),
  ('model-muscles-ZA_M_425487108', 'muscles'),
  ('model-muscles-ZA_M_476759195', 'muscles'),
  ('model-muscles-ZA_M_515084879', 'muscles'),
  ('model-muscles-ZA_M_603887740', 'muscles'),
  ('model-muscles-ZA_M_613075022', 'muscles'),
  ('model-muscles-ZA_M_645838197', 'muscles'),
  ('model-muscles-ZA_M_672824902', 'muscles'),
  ('model-muscles-ZA_M_702666376', 'muscles'),
  ('model-muscles-ZA_M_742840493', 'muscles'),
  ('model-muscles-ZA_M_754903007', 'muscles'),
  ('model-muscles-ZA_M_840440777', 'muscles'),
  ('model-muscles-ZA_M_76516835', 'muscles'),
  ('model-muscles-ZA_M_186032514', 'muscles'),
  ('model-muscles-ZA_M_227128969', 'muscles'),
  ('model-muscles-ZA_M_229882640', 'muscles'),
  ('model-muscles-ZA_M_300941212', 'muscles'),
  ('model-muscles-ZA_M_438057188', 'muscles'),
  ('model-muscles-ZA_M_468756190', 'muscles'),
  ('model-muscles-ZA_M_579432817', 'muscles'),
  ('model-muscles-ZA_M_644050133', 'muscles'),
  ('model-muscles-FJ1487', 'muscles'),
  ('model-muscles-ZA_M_669653987', 'muscles'),
  ('model-muscles-ZA_M_685970060', 'muscles'),
  ('model-muscles-ZA_M_792656413', 'muscles'),
  ('model-muscles-FJ1487M', 'muscles'),
  ('model-muscles-ZA_M_936196450', 'muscles'),
  ('model-muscles-ZA_M_991010553', 'muscles'),
  ('model-muscles-ZA_M_16666752', 'muscles'),
  ('model-muscles-ZA_M_70537146', 'muscles'),
  ('model-muscles-ZA_M_95762172', 'muscles'),
  ('model-muscles-ZA_M_119299853', 'muscles'),
  ('model-muscles-ZA_M_120834411', 'muscles'),
  ('model-muscles-ZA_M_137225793', 'muscles'),
  ('model-muscles-ZA_M_139021293', 'muscles'),
  ('model-muscles-ZA_M_210170064', 'muscles'),
  ('model-muscles-ZA_M_615707744', 'muscles'),
  ('model-muscles-ZA_M_863807001', 'muscles'),
  ('model-muscles-ZA_M_72952947', 'muscles'),
  ('model-muscles-ZA_M_351627082', 'muscles'),
  ('model-muscles-ZA_M_431474665', 'muscles'),
  ('model-muscles-ZA_M_599750783', 'muscles'),
  ('model-muscles-ZA_M_720352562', 'muscles'),
  ('model-muscles-ZA_M_805853519', 'muscles'),
  ('model-muscles-ZA_M_822740360', 'muscles'),
  ('model-muscles-ZA_M_898835004', 'muscles'),
  ('model-muscles-FJ1468', 'muscles'),
  ('model-muscles-FJ1513M', 'muscles'),
  ('model-muscles-FJ1513', 'muscles'),
  ('model-muscles-FJ1468M', 'muscles'),
  ('model-muscles-FJ1467', 'muscles'),
  ('model-muscles-FJ1467M', 'muscles'),
  ('model-muscles-ZA_M_533892148', 'muscles'),
  ('model-muscles-ZA_M_795125640', 'muscles'),
  ('model-muscles-ZA_M_15704527', 'muscles'),
  ('model-muscles-ZA_M_91031082', 'muscles'),
  ('model-muscles-ZA_M_125717541', 'muscles'),
  ('model-muscles-ZA_M_129597450', 'muscles'),
  ('model-muscles-ZA_M_208213720', 'muscles'),
  ('model-muscles-ZA_M_284427571', 'muscles'),
  ('model-muscles-ZA_M_397599056', 'muscles'),
  ('model-muscles-ZA_M_419899685', 'muscles'),
  ('model-muscles-ZA_M_451969346', 'muscles'),
  ('model-muscles-ZA_M_453234666', 'muscles'),
  ('model-muscles-ZA_M_462248653', 'muscles'),
  ('model-muscles-ZA_M_487845754', 'muscles'),
  ('model-muscles-ZA_M_532775298', 'muscles'),
  ('model-muscles-ZA_M_582478551', 'muscles'),
  ('model-muscles-ZA_M_642589773', 'muscles'),
  ('model-muscles-ZA_M_688306580', 'muscles'),
  ('model-muscles-ZA_M_711121981', 'muscles'),
  ('model-muscles-ZA_M_742200193', 'muscles'),
  ('model-muscles-ZA_M_770918531', 'muscles'),
  ('model-muscles-ZA_M_777465043', 'muscles'),
  ('model-muscles-ZA_M_815324855', 'muscles'),
  ('model-muscles-ZA_M_883584095', 'muscles'),
  ('model-muscles-ZA_M_886734839', 'muscles'),
  ('model-muscles-ZA_M_923257450', 'muscles'),
  ('model-muscles-FJ1480M', 'muscles'),
  ('model-muscles-FJ1477M', 'muscles'),
  ('model-muscles-FJ1479', 'muscles'),
  ('model-muscles-FJ1477', 'muscles'),
  ('model-muscles-FJ1479M', 'muscles'),
  ('model-muscles-FJ1480', 'muscles'),
  ('model-muscles-ZA_M_128216661', 'muscles'),
  ('model-muscles-ZA_M_31868790', 'muscles'),
  ('model-muscles-ZA_M_157599547', 'muscles'),
  ('model-muscles-ZA_M_191083487', 'muscles'),
  ('model-muscles-FJ1459M', 'muscles'),
  ('model-muscles-FJ1447', 'muscles'),
  ('model-muscles-FJ1464', 'muscles'),
  ('model-muscles-FJ1446M', 'muscles'),
  ('model-muscles-FJ1447M', 'muscles'),
  ('model-muscles-FJ1464M', 'muscles'),
  ('model-muscles-FJ1446', 'muscles'),
  ('model-muscles-ZA_M_414598510', 'muscles'),
  ('model-muscles-ZA_M_424990890', 'muscles'),
  ('model-muscles-ZA_M_494987468', 'muscles'),
  ('model-muscles-ZA_M_507270473', 'muscles'),
  ('model-muscles-ZA_M_147174551', 'muscles'),
  ('model-muscles-ZA_M_297608455', 'muscles'),
  ('model-muscles-ZA_M_920370703', 'muscles'),
  ('model-muscles-ZA_M_973471263', 'muscles'),
  ('model-muscles-ZA_M_589508516', 'muscles'),
  ('model-muscles-ZA_M_608923463', 'muscles'),
  ('model-muscles-ZA_M_745105214', 'muscles'),
  ('model-muscles-ZA_M_785902951', 'muscles'),
  ('model-muscles-ZA_M_922224497', 'muscles'),
  ('model-muscles-FJ1459', 'muscles'),
  ('model-muscles-ZA_M_26345914', 'muscles'),
  ('model-muscles-ZA_M_48745774', 'muscles'),
  ('model-muscles-FJ1573', 'muscles'),
  ('model-muscles-ZA_M_89108974', 'muscles'),
  ('model-muscles-ZA_M_101539905', 'muscles'),
  ('model-muscles-ZA_M_232430016', 'muscles'),
  ('model-muscles-ZA_M_320834542', 'muscles'),
  ('model-muscles-ZA_M_477994584', 'muscles'),
  ('model-muscles-ZA_M_569178355', 'muscles'),
  ('model-muscles-ZA_M_658450072', 'muscles'),
  ('model-muscles-ZA_M_680606748', 'muscles'),
  ('model-muscles-ZA_M_847892344', 'muscles'),
  ('model-muscles-ZA_M_996516042', 'muscles'),
  ('model-muscles-ZA_M_129052965', 'muscles'),
  ('model-muscles-ZA_M_152801301', 'muscles'),
  ('model-muscles-ZA_M_166631246', 'muscles'),
  ('model-muscles-ZA_M_311961097', 'muscles'),
  ('model-muscles-ZA_M_345413374', 'muscles'),
  ('model-muscles-ZA_M_90507634', 'muscles'),
  ('model-muscles-ZA_M_212506950', 'muscles'),
  ('model-muscles-ZA_M_288640873', 'muscles'),
  ('model-muscles-ZA_M_500941360', 'muscles'),
  ('model-muscles-ZA_M_501770121', 'muscles'),
  ('model-muscles-ZA_M_661472586', 'muscles'),
  ('model-muscles-ZA_M_599583974', 'muscles'),
  ('model-muscles-ZA_M_615077557', 'muscles'),
  ('model-muscles-ZA_M_754361266', 'muscles'),
  ('model-muscles-ZA_M_927154232', 'muscles'),
  ('model-muscles-ZA_M_542597791', 'muscles'),
  ('model-muscles-ZA_M_602040565', 'muscles'),
  ('model-muscles-ZA_M_18300540', 'muscles'),
  ('model-muscles-ZA_M_374613853', 'muscles'),
  ('model-muscles-ZA_M_477327636', 'muscles'),
  ('model-muscles-ZA_M_491676480', 'muscles'),
  ('model-muscles-ZA_M_560701376', 'muscles'),
  ('model-muscles-ZA_M_583706826', 'muscles'),
  ('model-muscles-ZA_M_718857339', 'muscles'),
  ('model-muscles-ZA_M_990931243', 'muscles'),
  ('model-muscles-ZA_M_807974891', 'muscles'),
  ('model-muscles-ZA_M_838496642', 'muscles'),
  ('model-muscles-ZA_M_851877161', 'muscles'),
  ('model-muscles-ZA_M_855884842', 'muscles'),
  ('model-muscles-ZA_M_874226674', 'muscles'),
  ('model-muscles-FJ1595', 'muscles'),
  ('model-muscles-ZA_M_4486047', 'muscles'),
  ('model-muscles-ZA_M_58725807', 'muscles'),
  ('model-muscles-ZA_M_75023327', 'muscles'),
  ('model-muscles-ZA_M_178185298', 'muscles'),
  ('model-muscles-ZA_M_405896380', 'muscles'),
  ('model-muscles-ZA_M_408763255', 'muscles'),
  ('model-muscles-ZA_M_418890029', 'muscles'),
  ('model-muscles-ZA_M_434060816', 'muscles'),
  ('model-muscles-ZA_M_447525674', 'muscles'),
  ('model-muscles-ZA_M_735262507', 'muscles'),
  ('model-muscles-ZA_M_764481694', 'muscles'),
  ('model-muscles-ZA_M_768368623', 'muscles'),
  ('model-muscles-ZA_M_839870420', 'muscles'),
  ('model-muscles-ZA_M_930319730', 'muscles'),
  ('model-muscles-ZA_M_998132198', 'muscles'),
  ('model-muscles-FJ1452M', 'muscles'),
  ('model-muscles-ZA_M_179023909', 'muscles'),
  ('model-muscles-ZA_M_235254145', 'muscles'),
  ('model-muscles-ZA_M_272619451', 'muscles'),
  ('model-muscles-ZA_M_304211659', 'muscles'),
  ('model-muscles-ZA_M_421310032', 'muscles'),
  ('model-muscles-ZA_M_473516794', 'muscles'),
  ('model-muscles-ZA_M_642806399', 'muscles'),
  ('model-muscles-ZA_M_795120383', 'muscles'),
  ('model-muscles-ZA_M_811540614', 'muscles'),
  ('model-muscles-ZA_M_881393607', 'muscles'),
  ('model-muscles-FJ1452', 'muscles'),
  ('model-skeleton-FJ3152', 'skeleton'),
  ('model-skeleton-FJ3153', 'skeleton'),
  ('model-skeleton-FJ3154', 'skeleton'),
  ('model-skeleton-FJ3155', 'skeleton'),
  ('model-skeleton-FJ3156', 'skeleton'),
  ('model-skeleton-FJ3157', 'skeleton'),
  ('model-skeleton-FJ3158', 'skeleton'),
  ('model-skeleton-FJ3159', 'skeleton'),
  ('model-skeleton-FJ3160', 'skeleton'),
  ('model-skeleton-FJ3161', 'skeleton'),
  ('model-skeleton-FJ3162', 'skeleton'),
  ('model-skeleton-FJ3163', 'skeleton'),
  ('model-skeleton-FJ3164', 'skeleton'),
  ('model-skeleton-FJ3165', 'skeleton'),
  ('model-skeleton-FJ3166', 'skeleton'),
  ('model-skeleton-FJ3167', 'skeleton'),
  ('model-skeleton-FJ3168', 'skeleton'),
  ('model-skeleton-FJ3169', 'skeleton'),
  ('model-skeleton-FJ3170', 'skeleton'),
  ('model-skeleton-FJ3171', 'skeleton'),
  ('model-skeleton-FJ3172', 'skeleton'),
  ('model-skeleton-FJ3173', 'skeleton'),
  ('model-skeleton-FJ3174', 'skeleton'),
  ('model-skeleton-FJ3175', 'skeleton'),
  ('model-skeleton-FJ3176', 'skeleton'),
  ('model-skeleton-FJ3177', 'skeleton'),
  ('model-skeleton-FJ3178', 'skeleton'),
  ('model-skeleton-FJ3179', 'skeleton'),
  ('model-skeleton-FJ3180', 'skeleton'),
  ('model-skeleton-FJ3181', 'skeleton'),
  ('model-skeleton-FJ3182', 'skeleton'),
  ('model-skeleton-FJ3183', 'skeleton'),
  ('model-skeleton-FJ3184', 'skeleton'),
  ('model-skeleton-FJ3185', 'skeleton'),
  ('model-skeleton-FJ3186', 'skeleton'),
  ('model-skeleton-FJ3187', 'skeleton'),
  ('model-skeleton-FJ3188', 'skeleton'),
  ('model-skeleton-FJ3189', 'skeleton'),
  ('model-skeleton-FJ3190', 'skeleton'),
  ('model-skeleton-FJ3191', 'skeleton'),
  ('model-skeleton-FJ3192', 'skeleton'),
  ('model-skeleton-FJ3193', 'skeleton'),
  ('model-skeleton-FJ3194', 'skeleton'),
  ('model-skeleton-FJ3195', 'skeleton'),
  ('model-skeleton-FJ3196', 'skeleton'),
  ('model-skeleton-FJ3197', 'skeleton'),
  ('model-skeleton-FJ3198', 'skeleton'),
  ('model-skeleton-FJ3199', 'skeleton'),
  ('model-skeleton-FJ3200', 'skeleton'),
  ('model-skeleton-FJ3201', 'skeleton'),
  ('model-skeleton-FJ3202', 'skeleton'),
  ('model-skeleton-FJ3203', 'skeleton'),
  ('model-skeleton-FJ3204', 'skeleton'),
  ('model-skeleton-FJ3205', 'skeleton'),
  ('model-skeleton-FJ3206', 'skeleton'),
  ('model-skeleton-FJ3207', 'skeleton'),
  ('model-skeleton-FJ3208', 'skeleton'),
  ('model-skeleton-FJ3209', 'skeleton'),
  ('model-skeleton-FJ3210', 'skeleton'),
  ('model-skeleton-FJ3211', 'skeleton'),
  ('model-skeleton-FJ3212', 'skeleton'),
  ('model-skeleton-FJ3213', 'skeleton'),
  ('model-skeleton-FJ3214', 'skeleton'),
  ('model-skeleton-FJ3215', 'skeleton'),
  ('model-skeleton-FJ3216', 'skeleton'),
  ('model-skeleton-FJ3217', 'skeleton'),
  ('model-skeleton-FJ3218', 'skeleton'),
  ('model-skeleton-FJ3219', 'skeleton'),
  ('model-skeleton-FJ3220', 'skeleton'),
  ('model-skeleton-FJ3221', 'skeleton'),
  ('model-skeleton-FJ3222', 'skeleton'),
  ('model-skeleton-FJ3223', 'skeleton'),
  ('model-skeleton-FJ3224', 'skeleton'),
  ('model-skeleton-FJ3225', 'skeleton'),
  ('model-skeleton-FJ3226', 'skeleton'),
  ('model-skeleton-FJ3227', 'skeleton'),
  ('model-skeleton-FJ3228', 'skeleton'),
  ('model-skeleton-FJ3229', 'skeleton'),
  ('model-skeleton-FJ3230', 'skeleton'),
  ('model-skeleton-FJ3231', 'skeleton'),
  ('model-skeleton-FJ3232', 'skeleton'),
  ('model-skeleton-FJ3233', 'skeleton'),
  ('model-skeleton-FJ3234', 'skeleton'),
  ('model-skeleton-FJ3235', 'skeleton'),
  ('model-skeleton-FJ3236', 'skeleton'),
  ('model-skeleton-FJ3237', 'skeleton'),
  ('model-skeleton-FJ3239', 'skeleton'),
  ('model-skeleton-FJ3240', 'skeleton'),
  ('model-skeleton-FJ3241', 'skeleton'),
  ('model-skeleton-FJ3242', 'skeleton'),
  ('model-skeleton-FJ3243', 'skeleton'),
  ('model-skeleton-FJ3244', 'skeleton'),
  ('model-skeleton-FJ3245', 'skeleton'),
  ('model-skeleton-FJ3246', 'skeleton'),
  ('model-skeleton-FJ3247', 'skeleton'),
  ('model-skeleton-FJ3248', 'skeleton'),
  ('model-skeleton-FJ3249', 'skeleton'),
  ('model-skeleton-FJ3250', 'skeleton'),
  ('model-skeleton-FJ3251', 'skeleton'),
  ('model-skeleton-FJ3252', 'skeleton'),
  ('model-skeleton-FJ3253', 'skeleton'),
  ('model-skeleton-FJ3254', 'skeleton'),
  ('model-skeleton-FJ3255', 'skeleton'),
  ('model-skeleton-FJ3256', 'skeleton'),
  ('model-skeleton-FJ3257', 'skeleton'),
  ('model-skeleton-FJ3258', 'skeleton'),
  ('model-skeleton-FJ3259', 'skeleton'),
  ('model-skeleton-FJ3260', 'skeleton'),
  ('model-skeleton-FJ3261', 'skeleton'),
  ('model-skeleton-FJ3262', 'skeleton'),
  ('model-skeleton-FJ3263', 'skeleton'),
  ('model-skeleton-FJ3264', 'skeleton'),
  ('model-skeleton-FJ3265', 'skeleton'),
  ('model-skeleton-FJ3267', 'skeleton'),
  ('model-skeleton-FJ3268', 'skeleton'),
  ('model-skeleton-FJ3269', 'skeleton'),
  ('model-skeleton-FJ3271', 'skeleton'),
  ('model-skeleton-FJ3272', 'skeleton'),
  ('model-skeleton-FJ3273', 'skeleton'),
  ('model-skeleton-FJ3274', 'skeleton'),
  ('model-skeleton-FJ3275', 'skeleton'),
  ('model-skeleton-FJ3276', 'skeleton'),
  ('model-skeleton-FJ3277', 'skeleton'),
  ('model-skeleton-FJ3278', 'skeleton'),
  ('model-skeleton-FJ3279', 'skeleton'),
  ('model-skeleton-FJ3280', 'skeleton'),
  ('model-skeleton-FJ3281', 'skeleton'),
  ('model-skeleton-FJ3282', 'skeleton'),
  ('model-skeleton-FJ3283', 'skeleton'),
  ('model-skeleton-FJ3284', 'skeleton'),
  ('model-skeleton-FJ3285', 'skeleton'),
  ('model-skeleton-FJ3286', 'skeleton'),
  ('model-skeleton-FJ3287', 'skeleton'),
  ('model-skeleton-FJ3288', 'skeleton'),
  ('model-skeleton-FJ3289', 'skeleton'),
  ('model-skeleton-FJ3290', 'skeleton'),
  ('model-skeleton-FJ3291', 'skeleton'),
  ('model-skeleton-FJ3292', 'skeleton'),
  ('model-skeleton-FJ3293', 'skeleton'),
  ('model-skeleton-FJ3294', 'skeleton'),
  ('model-skeleton-FJ3295', 'skeleton'),
  ('model-skeleton-FJ3296', 'skeleton'),
  ('model-skeleton-FJ3297', 'skeleton'),
  ('model-skeleton-FJ3298', 'skeleton'),
  ('model-skeleton-FJ3299', 'skeleton'),
  ('model-skeleton-FJ3300', 'skeleton'),
  ('model-skeleton-FJ3301', 'skeleton'),
  ('model-skeleton-FJ3302', 'skeleton'),
  ('model-skeleton-FJ3303', 'skeleton'),
  ('model-skeleton-FJ3304', 'skeleton'),
  ('model-skeleton-FJ3305', 'skeleton'),
  ('model-skeleton-FJ3306', 'skeleton'),
  ('model-skeleton-FJ3307', 'skeleton'),
  ('model-skeleton-FJ3308', 'skeleton'),
  ('model-skeleton-FJ3309', 'skeleton'),
  ('model-skeleton-FJ3310', 'skeleton'),
  ('model-skeleton-FJ3311', 'skeleton'),
  ('model-skeleton-FJ3312', 'skeleton'),
  ('model-skeleton-FJ3313', 'skeleton'),
  ('model-skeleton-FJ3314', 'skeleton'),
  ('model-skeleton-FJ3315', 'skeleton'),
  ('model-skeleton-FJ3316', 'skeleton'),
  ('model-skeleton-FJ3317', 'skeleton'),
  ('model-skeleton-FJ3318', 'skeleton'),
  ('model-skeleton-FJ3319', 'skeleton'),
  ('model-skeleton-FJ3320', 'skeleton'),
  ('model-skeleton-FJ3321', 'skeleton'),
  ('model-skeleton-FJ3322', 'skeleton'),
  ('model-skeleton-FJ3323', 'skeleton'),
  ('model-skeleton-FJ3324', 'skeleton'),
  ('model-skeleton-FJ3325', 'skeleton'),
  ('model-skeleton-FJ3326', 'skeleton'),
  ('model-skeleton-FJ3327', 'skeleton'),
  ('model-skeleton-FJ3328', 'skeleton'),
  ('model-skeleton-FJ3329', 'skeleton'),
  ('model-skeleton-FJ3330', 'skeleton'),
  ('model-skeleton-FJ3331', 'skeleton'),
  ('model-skeleton-FJ3332', 'skeleton'),
  ('model-skeleton-FJ3333', 'skeleton'),
  ('model-skeleton-FJ3334', 'skeleton'),
  ('model-skeleton-FJ3335', 'skeleton'),
  ('model-skeleton-FJ3336', 'skeleton'),
  ('model-skeleton-FJ3337', 'skeleton'),
  ('model-skeleton-FJ3338', 'skeleton'),
  ('model-skeleton-FJ3339', 'skeleton'),
  ('model-skeleton-FJ3340', 'skeleton'),
  ('model-skeleton-FJ3341', 'skeleton'),
  ('model-skeleton-FJ3342', 'skeleton'),
  ('model-skeleton-FJ3343', 'skeleton'),
  ('model-skeleton-FJ3344', 'skeleton'),
  ('model-skeleton-FJ3345', 'skeleton'),
  ('model-skeleton-FJ3346', 'skeleton'),
  ('model-skeleton-FJ3347', 'skeleton'),
  ('model-skeleton-FJ3348', 'skeleton'),
  ('model-skeleton-FJ3349', 'skeleton'),
  ('model-skeleton-FJ3350', 'skeleton'),
  ('model-skeleton-FJ3351', 'skeleton'),
  ('model-skeleton-FJ3352', 'skeleton'),
  ('model-skeleton-FJ3353', 'skeleton'),
  ('model-skeleton-FJ3354', 'skeleton'),
  ('model-skeleton-FJ3355', 'skeleton'),
  ('model-skeleton-FJ3356', 'skeleton'),
  ('model-skeleton-FJ3357', 'skeleton'),
  ('model-skeleton-FJ3358', 'skeleton'),
  ('model-skeleton-FJ3359', 'skeleton'),
  ('model-skeleton-FJ3360', 'skeleton'),
  ('model-skeleton-FJ3361', 'skeleton'),
  ('model-skeleton-FJ3362', 'skeleton'),
  ('model-skeleton-FJ3364', 'skeleton'),
  ('model-skeleton-FJ3365', 'skeleton'),
  ('model-skeleton-FJ3366', 'skeleton'),
  ('model-skeleton-FJ3367', 'skeleton'),
  ('model-skeleton-FJ3368', 'skeleton'),
  ('model-skeleton-FJ3369', 'skeleton'),
  ('model-skeleton-FJ3370', 'skeleton'),
  ('model-skeleton-FJ3371', 'skeleton'),
  ('model-skeleton-FJ3373', 'skeleton'),
  ('model-skeleton-FJ3374', 'skeleton'),
  ('model-skeleton-FJ3375', 'skeleton'),
  ('model-skeleton-FJ3377', 'skeleton'),
  ('model-skeleton-FJ3378', 'skeleton'),
  ('model-skeleton-FJ3379', 'skeleton'),
  ('model-skeleton-FJ3380', 'skeleton'),
  ('model-skeleton-FJ3381', 'skeleton'),
  ('model-skeleton-FJ3382', 'skeleton'),
  ('model-skeleton-FJ3383', 'skeleton'),
  ('model-skeleton-FJ3384', 'skeleton'),
  ('model-skeleton-FJ3385', 'skeleton'),
  ('model-skeleton-FJ3386', 'skeleton'),
  ('model-skeleton-FJ3387', 'skeleton'),
  ('model-skeleton-FJ3388', 'skeleton'),
  ('model-skeleton-FJ3389', 'skeleton'),
  ('model-skeleton-FJ3390', 'skeleton'),
  ('model-skeleton-FJ3391', 'skeleton'),
  ('model-skeleton-FJ3392', 'skeleton'),
  ('model-skeleton-FJ3393', 'skeleton'),
  ('model-skeleton-FJ3394', 'skeleton'),
  ('model-skeleton-FJ3395', 'skeleton'),
  ('model-landmark-femur-head', 'landmarks'),
  ('model-landmark-femur-neck', 'landmarks'),
  ('model-landmark-greater-trochanter', 'landmarks'),
  ('model-landmark-lesser-trochanter', 'landmarks'),
  ('model-landmark-medial-condyle', 'landmarks'),
  ('model-landmark-lateral-condyle', 'landmarks'),
  ('model-landmark-humerus-head', 'landmarks'),
  ('model-landmark-greater-tubercle', 'landmarks'),
  ('model-landmark-lesser-tubercle', 'landmarks'),
  ('model-landmark-deltoid-tuberosity', 'landmarks'),
  ('model-landmark-trochlea', 'landmarks'),
  ('model-landmark-capitulum', 'landmarks'),
  ('model-landmark-olecranon-fossa', 'landmarks'),
  ('model-landmark-scapula-spine', 'landmarks'),
  ('model-landmark-glenoid', 'landmarks'),
  ('model-landmark-acromion', 'landmarks'),
  ('model-landmark-coracoid', 'landmarks'),
  ('model-side-femur', 'landmarks'),
  ('model-side-humerus', 'landmarks'),
  ('model-side-scapula', 'landmarks')
on conflict (question_id) do update set collection = excluded.collection;

-- Serialize each account's complete INSERT transaction before any event-ID
-- uniqueness checks or earned-target/score writes. Concurrent multi-row syncs
-- can overlap both immutable event IDs and different targets; locking only in
-- the AFTER trigger can deadlock against the other transaction's inserted row.
-- Hash collisions merely serialize unrelated accounts; no data is shared.
create or replace function leaderboard_private.lock_study_event_account()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.user_id::text, 0));
  return new;
end;
$$;
revoke all on function leaderboard_private.lock_study_event_account() from public, anon, authenticated;

drop trigger if exists leaderboard_lock_study_event_account on public.study_events;
create trigger leaderboard_lock_study_event_account
  before insert on public.study_events
  for each row execute function leaderboard_private.lock_study_event_account();

create or replace function leaderboard_private.capture_study_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Study self-checks and missed-review retries have round:null. Imports never
  -- reach this branch. A reveal records correct:false. Match native JSON types.
  if new.kind = 'attempt'
    and new.payload -> 'correct' = 'true'::jsonb
    and jsonb_typeof(new.payload -> 'round') = 'number'
    and new.payload ->> 'round' ~ '^[1-9][0-9]{0,15}$'
  then
    insert into leaderboard_private.earned_targets (user_id, question_id)
    select new.user_id, q.question_id
    from leaderboard_private.questions q
    where q.question_id = new.payload ->> 'questionId'
      and q.collection = new.payload ->> 'collection'
    on conflict (user_id, question_id) do nothing;

    if found then
      insert into leaderboard_private.scores (user_id, score)
      values (new.user_id, 1)
      on conflict (user_id) do update
        set score = leaderboard_private.scores.score + 1;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function leaderboard_private.capture_study_event() from public, anon, authenticated;

drop trigger if exists leaderboard_capture_study_event on public.study_events;
create trigger leaderboard_capture_study_event
  after insert on public.study_events
  for each row execute function leaderboard_private.capture_study_event();

-- Existing signed-in quiz history counts. One award per recognized target,
-- regardless of retry IDs, repeated passes, or the client's event timestamps.
insert into leaderboard_private.earned_targets (user_id, question_id)
select distinct e.user_id, q.question_id
from public.study_events e
join leaderboard_private.questions q
  on q.question_id = e.payload ->> 'questionId'
 and q.collection = e.payload ->> 'collection'
where e.kind = 'attempt'
  and e.payload -> 'correct' = 'true'::jsonb
  and jsonb_typeof(e.payload -> 'round') = 'number'
  and e.payload ->> 'round' ~ '^[1-9][0-9]{0,15}$'
on conflict (user_id, question_id) do nothing;

insert into leaderboard_private.scores (user_id, score)
select user_id, count(*)::integer
from leaderboard_private.earned_targets
 group by user_id
on conflict (user_id) do update set score = excluded.score;

create or replace function public.get_leaderboard_profile()
returns jsonb
language sql stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('nickname', nickname, 'listed', listed)
  from leaderboard_private.profiles
  where user_id = (select auth.uid());
$$;

create or replace function public.set_leaderboard_profile(p_nickname text, p_listed boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  clean_nickname text := btrim(p_nickname);
begin
  if caller is null then
    raise exception 'Sign in to join the leaderboard.' using errcode = '42501';
  end if;
  if p_listed is null or clean_nickname is null
    or clean_nickname !~ '^[A-Za-z0-9 _-]{3,24}$'
    or clean_nickname !~ '[A-Za-z0-9]'
  then
    raise exception 'Use 3–24 letters, numbers, spaces, underscores or hyphens, including at least one letter or number.'
      using errcode = '22023';
  end if;

  insert into leaderboard_private.profiles (user_id, nickname, listed)
  values (caller, clean_nickname, p_listed)
  on conflict (user_id) do update
    set nickname = excluded.nickname, listed = excluded.listed;
  -- A case-insensitive nickname conflict retains SQLSTATE 23505 for the UI.
  return jsonb_build_object('nickname', clean_nickname, 'listed', p_listed);
end;
$$;

create or replace function public.get_global_leaderboard()
returns jsonb
language sql stable
security definer
set search_path = ''
as $$
  with ranked as materialized (
    select p.user_id, p.nickname, coalesce(s.score, 0) as score,
      rank() over (order by coalesce(s.score, 0) desc) as rank
    from leaderboard_private.profiles p
    left join leaderboard_private.scores s using (user_id)
    where p.listed
  ), top_entries as (
    select * from ranked
    order by score desc, lower(nickname) collate "C", nickname collate "C"
    limit 50
  )
  select jsonb_build_object(
    'entries', coalesce((select jsonb_agg(jsonb_build_object(
      'rank', rank, 'nickname', nickname, 'score', score,
      'is_you', coalesce(user_id = (select auth.uid()), false)
    ) order by score desc, lower(nickname) collate "C", nickname collate "C")
      from top_entries), '[]'::jsonb),
    'self', (select jsonb_build_object(
      'rank', rank, 'nickname', nickname, 'score', score, 'is_you', true
    ) from ranked where user_id = (select auth.uid())),
    'participants', (select count(*) from ranked),
    'total_questions', (select count(*) from leaderboard_private.questions)
  );
$$;

-- New functions default to PUBLIC execute in Postgres; explicitly revoke it.
revoke all on function public.get_leaderboard_profile() from public, anon, authenticated;
revoke all on function public.set_leaderboard_profile(text, boolean) from public, anon, authenticated;
revoke all on function public.get_global_leaderboard() from public, anon, authenticated;
grant usage on schema public to anon, authenticated;
grant execute on function public.get_leaderboard_profile() to authenticated;
grant execute on function public.set_leaderboard_profile(text, boolean) to authenticated;
grant execute on function public.get_global_leaderboard() to anon, authenticated;

commit;
