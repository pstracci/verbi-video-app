/*
********************************************
 Copyright © 2021 Agora Lab, Inc., all rights reserved.
 AppBuilder and all associated components, source code, APIs, services, and documentation
 (the “Materials”) are owned by Agora Lab, Inc. and its licensors. The Materials may not be
 accessed, used, modified, or distributed for any purpose without a license from Agora Lab, Inc.
 Use without a license or in violation of any license terms and conditions (including use for
 any purpose competitive to Agora Lab, Inc.’s business) is strictly prohibited. For more
 information visit https://appbuilder.agora.io.
*********************************************
*/
// @ts-nocheck
import React, {useState, useContext, useEffect, useRef} from 'react';
import {View, StyleSheet, Text} from 'react-native';
import {
  RtcConfigure,
  PropsProvider,
  ClientRoleType,
  ChannelProfileType,
  LocalUserContext,
  UidType,
  CallbacksInterface,
} from '../../agora-rn-uikit';
import styles from '../components/styles';
import {useHistory} from '../components/Router'; // Removido useParams
import RtmConfigure from '../components/RTMConfigure';
import DeviceConfigure from '../components/DeviceConfigure';
import Logo from '../subComponents/Logo';
import {useHasBrandLogo, isMobileUA, isWebInternal} from '../utils/common';
import {videoView} from '../../theme.json';
import {LiveStreamContextProvider} from '../components/livestream';
import ScreenshareConfigure from '../subComponents/screenshare/ScreenshareConfigure';
import {ErrorContext} from '.././components/common/index';
import {PreCallProvider} from '../components/precall/usePreCall';
import {LayoutProvider} from '../utils/useLayout';
import Precall from '../components/Precall';
import {RecordingProvider} from '../subComponents/recording/useRecording';
// import useJoinRoom from '../utils/useJoinRoom'; // REMOVIDO
import {
  useRoomInfo,
  RoomInfoDefaultValue,
  WaitingRoomStatus,
} from '../components/room-info/useRoomInfo';
import {SidePanelProvider} from '../utils/useSidePanel';
import {NetworkQualityProvider} from '../components/NetworkQualityContext';
import {ChatNotificationProvider} from '../components/chat-notification/useChatNotification';
import {ChatUIControlsProvider} from '../components/chat-ui/useChatUIControls';
import {ScreenShareProvider} from '../components/contexts/ScreenShareContext';
import {LiveStreamDataProvider} from '../components/contexts/LiveStreamDataContext';
import {VideoMeetingDataProvider} from '../components/contexts/VideoMeetingDataContext';
import {useWakeLock} from '../components/useWakeLock';
import SDKEvents from '../utils/SdkEvents';
import {UserPreferenceProvider} from '../components/useUserPreference';
import EventsConfigure from '../components/EventsConfigure';
import PermissionHelper from '../components/precall/PermissionHelper';
import {FocusProvider} from '../utils/useFocus';
import {VideoCallProvider} from '../components/useVideoCall';
import {SdkApiContext} from '../components/SdkApiContext';
import isSDK from '../utils/isSDK';
import {CaptionProvider} from '../subComponents/caption/useCaption';
import SdkMuteToggleListener from '../components/SdkMuteToggleListener';
import StorageContext from '../components/StorageContext';
import {useSetRoomInfo} from '../components/room-info/useSetRoomInfo';
import {NoiseSupressionProvider} from '../app-state/useNoiseSupression';
import {VideoQualityContextProvider} from '../app-state/useVideoQuality';
import {VBProvider} from '../components/virtual-background/useVB';
import {DisableChatProvider} from '../components/disable-chat/useDisableChat';
import {WaitingRoomProvider} from '../components/contexts/WaitingRoomContext';
import {isValidReactComponent} from '../utils/common';
import {ChatMessagesProvider} from '../components/chat-messages/useChatMessages';
import VideoCallScreenWrapper from './video-call/VideoCallScreenWrapper';
import {useIsRecordingBot} from '../subComponents/recording/useIsRecordingBot';
import {
  userBannedText,
  videoRoomStartingCallText,
} from '../language/default-labels/videoCallScreenLabels';
import {useString} from '../utils/useString';
import {LogSource, logger} from '../logger/AppBuilderLogger';
import {useCustomization} from 'customization-implementation';
import {BeautyEffectProvider} from '../components/beauty-effect/useBeautyEffects';
import {UserActionMenuProvider} from '../components/useUserActionMenu';
import Toast from '../../react-native-toast-message';
import {AuthErrorCodes} from '../utils/common';

enum RnEncryptionEnum {
  None = 0,
  AES128XTS = 1,
  AES128ECB = 2,
  AES256XTS = 3,
  SM4128ECB = 4,
  AES256GCM = 6,
  AES128GCM2 = 7,
  AES256GCM2 = 8,
}

const VideoCall: React.FC = () => {
  const hasBrandLogo = useHasBrandLogo();
  const joiningLoaderLabel = useString(videoRoomStartingCallText)();
  const bannedUserText = useString(userBannedText)();
  const {setGlobalErrorMessage} = useContext(ErrorContext);
  const {awake, release} = useWakeLock();

  // --- NOVA LÓGICA DE SEGURANÇA ---
  const [authError, setAuthError] = useState(null);
  // --- FIM DA NOVA LÓGICA ---

  const [callActive, setCallActive] = useState(false);
  const [isRecordingActive, setRecordingActive] = useState(false);
  const [queryComplete, setQueryComplete] = useState(false);
  const [sttAutoStarted, setSttAutoStarted] = useState(false);
  const [recordingAutoStarted, setRecordingAutoStarted] = useState(false);

  const {store} = useContext(StorageContext);
  const {
    join: SdkJoinState,
    microphoneDevice: sdkMicrophoneDevice,
    cameraDevice: sdkCameraDevice,
    clearState,
  } = useContext(SdkApiContext);

  const afterEndCall = useCustomization(
    data =>
      data?.lifecycle?.useAfterEndCall && data?.lifecycle?.useAfterEndCall(),
  );

  const {PrefereceWrapper} = useCustomization(data => {
    let components: {
      PrefereceWrapper: React.ComponentType;
    } = {
      PrefereceWrapper: React.Fragment,
    };
    if (
      data?.components?.preferenceWrapper &&
      typeof data?.components?.preferenceWrapper !== 'object' &&
      isValidReactComponent(data?.components?.preferenceWrapper)
    ) {
      components.PrefereceWrapper = data?.components?.preferenceWrapper;
    }
    return components;
  });

  const [rtcProps, setRtcProps] = React.useState({
    appId: $config.APP_ID,
    channel: null,
    uid: null,
    token: null,
    rtm: null,
    screenShareUid: null,
    screenShareToken: null,
    profile: $config.PROFILE,
    screenShareProfile: $config.SCREEN_SHARE_PROFILE,
    dual: true,
    encryption: false, // Encryption disabled for simplicity, can be re-enabled
    role: ClientRoleType.ClientRoleBroadcaster,
    geoFencing: $config.GEO_FENCING,
    audioRoom: $config.AUDIO_ROOM,
    activeSpeaker: $config.ACTIVE_SPEAKER,
    preferredCameraId: store?.activeDeviceId?.videoinput || null,
    preferredMicrophoneId: store?.activeDeviceId?.audioinput || null,
  });

  const history = useHistory();
  const {setRoomInfo} = useSetRoomInfo();
  
  React.useEffect(() => {
    return () => {
      logger.debug(
        LogSource.Internals,
        'VIDEO_CALL_ROOM',
        'Videocall unmounted',
      );
      setRoomInfo(prevState => {
        return {
          ...RoomInfoDefaultValue,
          loginToken: prevState?.loginToken,
        };
      });
      if (awake) {
        release();
      }
    };
  }, []);

  // --- NOVA LÓGICA DE SEGURANÇA ADICIONADA ---
  useEffect(() => {
    // Esta função será executada apenas uma vez quando o componente carregar
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const channel = urlParams.get('channel');
    const uidString = urlParams.get('uid');
    
    // Verifica se os parâmetros necessários existem na URL
    if (!token || !channel || !uidString) {
      setAuthError("Acesso inválido ou expirado. Por favor, crie uma sala a partir do site principal do Verbi.");
      return; // Para a execução
    }

    // Se os parâmetros existirem, configura as propriedades do RTC
    const uid = Number(uidString);
    if (isNaN(uid)) {
      setAuthError("UID inválido.");
      return;
    }

    setRtcProps(prevRtcProps => ({
      ...prevRtcProps,
      channel: channel,
      uid: uid,
      token: token,
    }));
    
    // Ativa a tela de chamada
    setCallActive(true);
    // Marca a "query" como completa para remover a tela de loading
    setQueryComplete(true);

  }, []); // O array vazio [] garante que isso só rode uma vez

  const callbacks: CallbacksInterface = {
    EndCall: () => {
      clearState('join');
      setTimeout(() => {
        SDKEvents.emit('leave');
        if (afterEndCall) {
          afterEndCall(data.isHost, history as unknown as History);
        } else {
          history.push('/');
        }
      }, 0);
    },
    UserJoined: (uid: UidType) => {
      console.log('UIKIT Callback: UserJoined', uid);
      SDKEvents.emit('rtc-user-joined', uid);
    },
    UserOffline: (uid: UidType) => {
      console.log('UIKIT Callback: UserOffline', uid);
      SDKEvents.emit('rtc-user-left', uid);
    },
    RemoteAudioStateChanged: (uid: UidType, status: 0 | 2) => {
      if (status === 0) {
        SDKEvents.emit('rtc-user-unpublished', uid, 'audio');
      } else {
        SDKEvents.emit('rtc-user-published', uid, 'audio');
      }
    },
    RemoteVideoStateChanged: (uid: UidType, status: 0 | 2) => {
      if (status === 0) {
        SDKEvents.emit('rtc-user-unpublished', uid, 'video');
      } else {
        SDKEvents.emit('rtc-user-published', uid, 'video');
      }
    },
    UserBanned(isBanned) {
      Toast.show({
        leadingIconName: 'alert',
        type: 'error',
        text1: bannedUserText,
        visibilityTime: 3000,
      });
    },
  };

  // --- LÓGICA DE RENDERIZAÇÃO ATUALIZADA ---
  if (authError) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000'}}>
        <Text style={{color: '#fff', fontSize: 18, paddingHorizontal: 20, textAlign: 'center'}}>{authError}</Text>
      </View>
    );
  }

  return (
    <>
      {queryComplete ? (
        <PropsProvider
          value={{
            rtcProps: {
              ...rtcProps,
              callActive,
            },
            callbacks,
            styleProps,
            mode: $config.EVENT_MODE
              ? ChannelProfileType.ChannelProfileLiveBroadcasting
              : ChannelProfileType.ChannelProfileCommunication,
          }}>
          <RtcConfigure>
            <DeviceConfigure>
              <NoiseSupressionProvider callActive={callActive}>
                <VideoQualityContextProvider>
                  <ChatUIControlsProvider>
                    <ChatNotificationProvider>
                      <LayoutProvider>
                        <FocusProvider>
                          <SidePanelProvider>
                            <ChatMessagesProvider callActive={callActive}>
                              <ScreenShareProvider>
                                <RtmConfigure callActive={callActive}>
                                  <UserPreferenceProvider callActive={callActive}>
                                    <CaptionProvider>
                                      <WaitingRoomProvider>
                                        <EventsConfigure
                                          setSttAutoStarted={setSttAutoStarted}
                                          sttAutoStarted={sttAutoStarted}
                                          callActive={callActive}>
                                          <ScreenshareConfigure
                                            isRecordingActive={isRecordingActive}>
                                            <LiveStreamContextProvider
                                              value={{
                                                setRtcProps,
                                                rtcProps,
                                                callActive,
                                              }}>
                                              <LiveStreamDataProvider>
                                                <LocalUserContext
                                                  localUid={rtcProps?.uid}>
                                                  <RecordingProvider
                                                    value={{
                                                      setRecordingActive,
                                                      isRecordingActive,
                                                      callActive,
                                                      recordingAutoStarted,
                                                      setRecordingAutoStarted,
                                                    }}>
                                                    <NetworkQualityProvider>
                                                      {!isMobileUA() && (
                                                        <PermissionHelper />
                                                      )}
                                                      <UserActionMenuProvider>
                                                        <VBProvider>
                                                          <BeautyEffectProvider>
                                                            <PrefereceWrapper
                                                              callActive={
                                                                callActive
                                                              }
                                                              setCallActive={
                                                                setCallActive
                                                              }>
                                                              <SdkMuteToggleListener>
                                                                {callActive ? (
                                                                  <VideoMeetingDataProvider>
                                                                    <VideoCallProvider>
                                                                      <DisableChatProvider>
                                                                        <VideoCallScreenWrapper />
                                                                      </DisableChatProvider>
                                                                    </VideoCallProvider>
                                                                  </VideoMeetingDataProvider>
                                                                ) : $config.PRECALL ? (
                                                                  <PreCallProvider
                                                                    value={{
                                                                      callActive,
                                                                      setCallActive,
                                                                    }}>
                                                                    <Precall />
                                                                  </PreCallProvider>
                                                                ) : (
                                                                  <></>
                                                                )}
                                                              </SdkMuteToggleListener>
                                                            </PrefereceWrapper>
                                                          </BeautyEffectProvider>
                                                        </VBProvider>
                                                      </UserActionMenuProvider>
                                                    </NetworkQualityProvider>
                                                  </RecordingProvider>
                                                </LocalUserContext>
                                              </LiveStreamDataProvider>
                                            </LiveStreamContextProvider>
                                          </ScreenshareConfigure>
                                        </EventsConfigure>
                                      </WaitingRoomProvider>
                                    </CaptionProvider>
                                  </UserPreferenceProvider>
                                </RtmConfigure>
                              </ScreenShareProvider>
                            </ChatMessagesProvider>
                          </SidePanelProvider>
                        </FocusProvider>
                      </LayoutProvider>
                    </ChatNotificationProvider>
                  </ChatUIControlsProvider>
                </VideoQualityContextProvider>
              </NoiseSupressionProvider>
            </DeviceConfigure>
          </RtcConfigure>
        </PropsProvider>
      ) : (
        <View style={style.loader}>
          <View style={style.loaderLogo}>{hasBrandLogo() && <Logo />}</View>
          <Text style={style.loaderText}>{joiningLoaderLabel}</Text>
        </View>
      )}
    </>
  );
};

const styleProps = {
  maxViewStyles: styles.temp,
  minViewStyles: styles.temp,
  localBtnContainer: styles.bottomBar,
  localBtnStyles: {
    muteLocalAudio: styles.localButton,
    muteLocalVideo: styles.localButton,
    switchCamera: styles.localButton,
    endCall: styles.endCall,
    fullScreen: styles.localButton,
    recording: styles.localButton,
    screenshare: styles.localButton,
  },
  theme: $config.PRIMARY_ACTION_BRAND_COLOR,
  remoteBtnStyles: {
    muteRemoteAudio: styles.remoteButton,
    muteRemoteVideo: styles.remoteButton,
    remoteSwap: styles.remoteButton,
    minCloseBtnStyles: styles.minCloseBtn,
    liveStreamHostControlBtns: styles.liveStreamHostControlBtns,
  },
  BtnStyles: styles.remoteButton,
};
const style = StyleSheet.create({
  full: {
    flex: 1,
    flexDirection: 'column',
    overflow: 'hidden',
  },
  videoView: videoView,
  loader: {
    flex: 1,
    alignSelf: 'center',
    justifyContent: 'center',
  },
  loaderLogo: {
    alignSelf: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  loaderText: {fontWeight: '500', color: $config.FONT_COLOR},
});

export default VideoCall;