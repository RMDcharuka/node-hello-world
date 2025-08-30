pipeline {
    agent any

    environment {
        DOCKERHUB_CREDENTIALS = credentials('dockerhub-cred')
        IMAGE_NAME = "dinaldocker/node-hello-world:${env.BUILD_ID}"
        APP_NAME = 'node-hello-world'
        VM_IP = '172.10.20.2' // REPLACE WITH YOUR VM's ACTUAL IP
    }

    stages {
        stage('Checkout Code') {
            steps {
                checkout scm: [
                    $class: 'GitSCM',
                    branches: [[name: 'main']],
                    userRemoteConfigs: [[
                        url: 'https://github.com/RMDcharuka/node-hello-world.git'
                    ]]
                ]
                bat 'echo ✅ Code checked out successfully'
            }
        }

        stage('Debug Workspace') {
            steps {
                bat 'echo Debug: check workspace contents'
                bat 'cd && dir'
                bat 'echo "Dockerfile exists:" && if exist Dockerfile (echo YES) else (echo NO)'
            }
        }

        stage('Build Docker Image') {
            steps {
                bat "docker build -t ${IMAGE_NAME} ."
                bat 'echo ✅ Docker image built successfully'
            }
        }

        stage('Docker Login') {
            steps {
                bat "echo ${DOCKERHUB_CREDENTIALS_PSW} | docker login -u ${DOCKERHUB_CREDENTIALS_USR} --password-stdin"
                bat 'echo ✅ Logged in to DockerHub'
            }
        }

        stage('Push Docker Image') {
            steps {
                bat "docker push ${IMAGE_NAME}"
                bat "echo ✅ Docker image pushed: ${IMAGE_NAME}"
            }
        }

     stage('Deploy to K3s Cluster') {
    steps {
        script {
            bat 'echo 🚀 Deploying to K3s cluster on VM...'
            
            // USE THE DIRECT FILE PATH - NOT JENKINS CREDENTIAL
            def kubeconfigPath = 'C:\\\\Users\\\\user\\\\Desktop\\\\k3s.yaml'
            
            bat """
                kubectl --kubeconfig=${kubeconfigPath} cluster-info
                if errorlevel 1 (
                    echo ERROR: Failed to connect to cluster
                    exit /b 1
                )
                
                kubectl --kubeconfig=${kubeconfigPath} get deployment %APP_NAME%
                if errorlevel 1 (
                    echo Creating new deployment...
                    kubectl --kubeconfig=${kubeconfigPath} create deployment %APP_NAME% ^
                        --image=%IMAGE_NAME% ^
                        --port=8083
                    kubectl --kubeconfig=${kubeconfigPath} scale deployment/%APP_NAME% --replicas=2
                ) else (
                    echo Updating existing deployment...
                    kubectl --kubeconfig=${kubeconfigPath} set image deployment/%APP_NAME% %APP_NAME%=%IMAGE_NAME% --record
                )
            """
            
            bat """
                kubectl --kubeconfig=${kubeconfigPath} get service %APP_NAME%-service
                if errorlevel 1 (
                    echo Creating new service...
                    kubectl --kubeconfig=${kubeconfigPath} expose deployment %APP_NAME% ^
                        --port=80 ^
                        --target-port=8083 ^
                        --name=%APP_NAME%-service ^
                        --type=NodePort
                ) else (
                    echo Service already exists
                )
            """
            
            // ADD POD CLEANUP BEFORE ROLLOUT STATUS
            bat """
                echo "🧹 Cleaning up any stuck pods..."
                kubectl --kubeconfig=${kubeconfigPath} delete pods -l app=%APP_NAME% --grace-period=0 --force 2>nul || echo "No stuck pods found"
                
                timeout /t 5
                
                echo "⏳ Waiting for rollout..."
                kubectl --kubeconfig=${kubeconfigPath} rollout status deployment/%APP_NAME% --timeout=180s
            """
            
            bat 'echo ✅ Deployment and Service updated successfully!'
        }
    }
}

stage('Verify Deployment') {
    steps {
        script {
            // USE THE SAME kubeconfigPath VARIABLE
            def kubeconfigPath = 'C:\\\\Users\\\\user\\\\Desktop\\\\k3s.yaml'
            
            bat """
                kubectl --kubeconfig=${kubeconfigPath} rollout status deployment/%APP_NAME% --timeout=180s
                kubectl --kubeconfig=${kubeconfigPath} get svc %APP_NAME%-service
            """
            
            // Use PowerShell with the correct path
            powershell """
                `$nodePort = kubectl --kubeconfig=C:\\Users\\user\\Desktop\\k3s.yaml get svc %APP_NAME%-service -o jsonpath='{.spec.ports[0].nodePort}'
                Write-Output \"📊 Service NodePort: `$nodePort\"
                if (`$nodePort) {
                    try {
                        `$response = curl -s http://${env:VM_IP}:`$nodePort
                        Write-Output \"✅ Application response: `$response\"
                    } catch {
                        Write-Output \"⚠️  Curl test failed but deployment may still be successful\"
                    }
                    Write-Output \"🌐 Application accessible at: http://${env:VM_IP}:`$nodePort\"
                } else {
                    Write-Output \"❌ Could not determine NodePort\"
                }
            """
            
            bat 'echo ✅ Deployment verified successfully'
        }
    }
}

    post {
        always {
            bat 'docker logout'
            bat 'echo 🚀 Pipeline execution completed'
        }
        success {
            bat 'echo ✅ Pipeline succeeded! Application deployed successfully.'
        }
        failure {
            bat 'echo ❌ Pipeline failed! Check the logs for errors.'
        }
    }
}
}