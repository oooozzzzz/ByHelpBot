export type service = {
  Id: number;
  Name: string;
  PriceS: number;
  PriceE: number;
  Duration: number;
  ServiceType: string;
  CategoryId: number;
  Category: string;
  BranchId: number;
  IsDeleted: boolean;
  CountEmployees: number;
  ClientServiceAdditions: any[] | undefined | null;
};

export type employee = {
  Id: number;
  NameFirst: string;
  NameLast: string;
  NameFull: string;
  Gender: string;
  PositionId: number;
  Position: string;
  IsDeleted: boolean;
  IsTerminated: boolean;
  CountClientServices: number;
  WorkScheduleTill: string;
  IsBelongToCurrentBranch: boolean;
};

type serviceInRecord = {
  ServiceId: number;
  Service: string;
  Count: number;
  Cost: number;
  Discount: number;
  CostWithDiscount: number;
  Paid: number;
};

export type record = {
  RecordId: number;
  TimeS: string;
  TimeE: string;
  Status: string;
  EmployeeId: number;
  Employee: string;
  Comment: string;
  IsUnpaid: boolean;
  Services: serviceInRecord[] | undefined | null;
};

export type employeeByService = {
  UserId: number;
  NameLast: string;
  NameFirst: string;
  NameMiddle: string;
  Date: string;
  BranchId: number;
  IsWorking: boolean;
};

export type employeesRecord = {
  UserId: number;
  NameLast: string;
  NameFirst: string;
  NameMiddle: string;
  NameFull: string;
  Photo: string;
  PositionId: number;
  Position: string;
  IsDeleted: boolean;
  Date: string;
};

export type client = {
  Id: number;
  BranchId: number;
  NameLast: string;
  NameFirst: string;
  NameMiddle: string;
  Gender: string;
  Email: string;
  Phone1: string;
  Phone1CountryId: number;
  Phone2: string;
  Phone2CountryId: number;
  DateBirth: string;
  IsPhoneVerified: boolean;
  IsDeleted: boolean;
  Photo: string;
  LanguageId: number;
  Language: string;
  ClientTags: any[] | undefined | null;
  MigrateId: number;
  Comment: string;
};

export type tag = {
  Id: number;
  Name: string;
  Color: string;
  IconId: string;
  Description: string;
  IsDeleted: boolean;
  IsSelected: boolean;
  IsSystem: boolean;
  SystemId: string | null;
};

type serviceInRecordBody = {
  Id: number;
  Name: string;
  CategoryId: number;
  Category: string;
  PriceS: number;
  PriceE: number;
  Duration: number;
  Count: number;
  UserId?: number;
  Discount: number;
  Paid: number;
};

export type createRecordBody = {
  Id?: number;
  BranchId: number;
  EmployeeId: number;
  ClientId: number;
  NameFirst: string;
  TimeS: string;
  TimeE: string;
  Phone: string;
  IsPhoneVerified?: boolean;
  PhoneCountryId?: number;
  ClientServices?: serviceInRecordBody[];
  Status?: string;
  Comment?: string;
  IsEmployeeLocked?: boolean;
  IsDeleted?: boolean;
  Tags?: tag[];
  IsFirstVisit?: boolean;
  OtherRecords?: any[];
  MigrateId?: number;
  MigrateClientId?: number;
  IsPaid?: boolean;
  IsCostZero?: boolean;
  IsNoNotify?: boolean;
  RecordColor?: string;
  ClientFutureRecordIds?: any[];
};

export type schedule = {
  Id: number;
  UserId: number;
  BranchId: number;
  TimeS: string;
  TimeE: string;
  IsIgnoreRecords: boolean;
};

export type employeesScheduleResponse = {
  UserId: number;
  UserName: string;
  DateS: string;
  DateE: string;
  WorkSchedules: schedule[];
}[];

export type workBreak = {
  Id: number;
  UserId: number;
  BranchId: number;
  TimeS: string;
  TimeE: string;
};

export type employeeRecordsResponse = {
  UserId: number;
  NameLast: string;
  NameFirst: string;
  NameMiddle: string;
  NameFull: string;
  Photo: string;
  PositionId: number;
  Position: string;
  IsDeleted: boolean;
  Date: string;
  Records: record[];
  WorkBreaks: workBreak[] | undefined | null;
}[];

export type serviceTip = {
  RecordType: string;
  TimeS: string;
  TimeE: string;
};

export type Branch = {
  Id: number;
  TimeCreated: string;
  CreateUserId: number;
  LegalEntityId: number;
  LegalEntity: string;
  Name: string;
  Timezone: string;
  ChainId: number;
  CountryId: number;
  Country: string | null;
  City: string;
  Address: string;
  OrganizationName: string | null;
  Coordinates: string;
  IsDeleted: boolean;
  CountUsers: number;
  MoS: string;
  MoE: string;
  TuS: string;
  TuE: string;
  WeS: string;
  WeE: string;
  ThS: string;
  ThE: string;
  FrS: string;
  FrE: string;
  SaS: string | null;
  SaE: string | null;
  SuS: string | null;
  SuE: string | null;
  MoBreakS: string | null;
  MoBreakE: string | null;
  TuBreakS: string | null;
  TuBreakE: string | null;
  WeBreakS: string | null;
  WeBreakE: string | null;
  ThBreakS: string | null;
  ThBreakE: string | null;
  FrBreakS: string | null;
  FrBreakE: string | null;
  SaBreakS: string | null;
  SaBreakE: string | null;
  SuBreakS: string | null;
  SuBreakE: string | null;
  IsWorkOutsideSchedule: boolean;
  MigrateId: number | null;
  NotificationsAddress: string;
  NotificationsPhone: string;
};

export type SearchLeadsFilter = {
  SearchTerm?: string | undefined;
  SearchTermIn: string;
  DateCreateS?: string;
  DateCreateE?: string;
  DateActiveS: string;
  DateActiveE: string;
  UserIds?: number[];
  IntegrationIds?: number[];
  StatusIds?: string[];
  ChannelIds?: string[];
  BranchIds?: number[];
  TagFilters?: {
    OuterInclude: boolean;
    InnerInclude: boolean;
    ItemIds: number[];
  }[];
  SalesFunnelsStages?: number[];
  MaxItems: number;
};

export type Lead = {
  Id: number;
  CreateTime: string;
  ClientId: number;
  BranchId: number;
  ClientName: string;
  ClientPhone: string;
  ClientAccountName: string | null;
  UserId: number;
  UserName: string | null;
  LastUpdate: string | null;
  LastMessage: string | null;
  Direction: "in" | "out";
  UnreadMessage: string | null;
  IsNoAnswer: boolean;
  UserAnswerTill: string | null;
  SocialIntegrationId: number;
  SocialIntegrationType: string;
  SоcialIntegrationName: string;
  ClientTags: any[];
  FunnelStages: any[];
  SpamTime: string | null;
  ClientCrmTasks: any | null;
  OpenCrmTask: any | null;
  IsNoCommunication: boolean;
  FirstChannelId: string | null;
};

export type SearchLeadsResponse = {
  SearchId: number;
  Filter: SearchLeadsFilter;
  Items: Lead[];
};

export type ChatMessage = {
  MessageId: number;
  Type: "TEXT";
  Timestamp: string;
  ClientId: number;
  UserId: number;
  BranchId: number;
  BranchName: string;
  UserFirstName: string;
  UserLastName: string;
  UserPhoto: string | null;
  SocialIntegrationId: number;
  Direction: "in";
  Status: string;
  ErrorMessage: string | null;
  Message: string;
  File: string | null;
  FileId: number;
  WasEdited: boolean;
  ReactionEmojiOwn: string | null;
  ReactionEmojiCompanion: string | null;
  LocationLatLon: string | null;
  LocationAddress: string | null;
  LocationName: string | null;
  ReplyClientMessageId: number | null;
  ReplyClientMessage: string | null;
  IsForwarded: boolean;
  SenderAccountLogin: string;
  ReceiverAccountLogin: string;
  SocialIntegrationName: string;
  SocialType: string;
  SocialTypeUserFriendly: string;
};

export type SendMessageToClientBody = {
  IntegrationId: number;
  Destination: {
    Phone: string;
    ClientId: number;
    LeadId: number;
  };
  Message: string;
  Attachments?: {
    Description: string;
    FileName: string;
    FileSize: number;
    Data: string;
  }[];

  IsSendout: boolean;
};

export type AILearnInfo = {
  Content: string;
  Type: string;
  OrganizationId: number;
  TimeUpdated: string;
};

export type AIUser = {
  Id: number;
  NameLast: string;
  NameFirst: string;
  NameMiddle: string;
  Gender: string;
  NameGenitive: string;
  NameDative: string;
  Email: string;
  Phone: string;
  PhoneCountryId: number;
  PhoneCode: string;
  PositionId: number;
  DateBirth: string;
  IsDeleted: boolean;
  IsAdmin: boolean;
  Photo: string;
  UserBranchIds: number[];
  Description: string;
  IsEmployee: boolean;
  IsAi: boolean;
  AlterIsEmployee: boolean;
  DateWorkStart: string;
  DatePatentEnd: string;
  PassportInfo: string;
  TaxPayerId: number;
  InsuranceCertificateN: string;
  Citizenship: string;
  IsTerminated: boolean;
  IsSaveAdditions: boolean;
  MigrateId: number;
  IsFakeEmail: boolean;
  IsFakePhone: boolean;
};

export type ClientAction = {
  Timestamp: string;
  ActionId: string;
  ActionUserId: number;
  ObjectId: number;
  Icon: string;
  ActionUser: string;
  ObjectType: string;
  ObjectS: string;
  ActionText: string;
  IsImportantAction: boolean;
  ActionItems: {
    Icon: string;
    ValueOld: string;
    ValueNew: string;
    Property: string;
  }[];

  Files: {
    Id: number;
    TimeCreated: string;
    ClientId: number;
    Description: string;
    FileName: string;
    FileSize: number;
    Data: string;
    Extension: string;
    Thumbnail: string;
    ClientMessageId: number;
  }[];

  ChatMessages: ChatMessage[];
};
