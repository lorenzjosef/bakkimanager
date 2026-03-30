import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';

// Root stack params
export type RootStackParamList = {
  Login: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
};

// Main tabs params
export type MainTabParamList = {
  Tasks: undefined;
  Map: undefined;
  Areas: undefined;
  Profile: undefined;
};

// Task stack params
export type TaskStackParamList = {
  TaskList: undefined;
  TaskDetail: { taskId: string };
};

// Map stack params
export type MapStackParamList = {
  MapView: undefined;
  AreaDetail: { areaId: string };
};

// Areas stack params (owner enhanced)
export type AreasStackParamList = {
  AreasList: undefined;
  AreaDetail: { areaId: string };
  CreateArea: undefined;
  CaptureBoundary: { mode: 'walk' | 'points' };
  ReviewDraft: { draftId: string };
};

// Screen props types
export type RootStackScreenProps<T extends keyof RootStackParamList> = 
  NativeStackScreenProps<RootStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> = 
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, T>,
    RootStackScreenProps<keyof RootStackParamList>
  >;

export type TaskStackScreenProps<T extends keyof TaskStackParamList> = 
  NativeStackScreenProps<TaskStackParamList, T>;

export type MapStackScreenProps<T extends keyof MapStackParamList> = 
  NativeStackScreenProps<MapStackParamList, T>;

export type AreasStackScreenProps<T extends keyof AreasStackParamList> = 
  NativeStackScreenProps<AreasStackParamList, T>;
