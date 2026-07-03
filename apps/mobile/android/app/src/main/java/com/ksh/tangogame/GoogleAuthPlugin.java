package com.ksh.tangogame;

import android.os.CancellationSignal;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.GetCredentialCancellationException;
import androidx.credentials.exceptions.GetCredentialException;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;
import java.util.concurrent.atomic.AtomicBoolean;

@CapacitorPlugin(name = "GoogleAuth")
public class GoogleAuthPlugin extends Plugin {
    private final AtomicBoolean signInInProgress = new AtomicBoolean(false);

    @PluginMethod
    public void signIn(PluginCall call) {
        String serverClientId = call.getString("serverClientId");
        if (serverClientId == null || serverClientId.trim().isEmpty()) {
            call.reject("MISSING_SERVER_CLIENT_ID");
            return;
        }
        if (!signInInProgress.compareAndSet(false, true)) {
            call.reject("GOOGLE_SIGN_IN_IN_PROGRESS");
            return;
        }

        GetSignInWithGoogleOption googleOption =
            new GetSignInWithGoogleOption.Builder(serverClientId).build();
        GetCredentialRequest request =
            new GetCredentialRequest.Builder().addCredentialOption(googleOption).build();
        CredentialManager credentialManager = CredentialManager.create(getContext());

        credentialManager.getCredentialAsync(
            getActivity(),
            request,
            new CancellationSignal(),
            ContextCompat.getMainExecutor(getContext()),
            new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                @Override
                public void onResult(GetCredentialResponse response) {
                    signInInProgress.set(false);
                    Credential credential = response.getCredential();
                    if (!(credential instanceof CustomCredential)) {
                        call.reject("UNSUPPORTED_GOOGLE_CREDENTIAL");
                        return;
                    }
                    CustomCredential customCredential = (CustomCredential) credential;
                    if (!GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(
                        customCredential.getType()
                    )) {
                        call.reject("UNSUPPORTED_GOOGLE_CREDENTIAL");
                        return;
                    }
                    try {
                        GoogleIdTokenCredential googleCredential =
                            GoogleIdTokenCredential.createFrom(customCredential.getData());
                        JSObject result = new JSObject();
                        result.put("idToken", googleCredential.getIdToken());
                        call.resolve(result);
                    } catch (RuntimeException error) {
                        call.reject("INVALID_GOOGLE_CREDENTIAL", error);
                    }
                }

                @Override
                public void onError(GetCredentialException error) {
                    signInInProgress.set(false);
                    if (error instanceof GetCredentialCancellationException) {
                        call.reject("GOOGLE_SIGN_IN_CANCELED");
                    } else {
                        call.reject("GOOGLE_SIGN_IN_FAILED", error);
                    }
                }
            }
        );
    }
}
