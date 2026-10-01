nextflow.enable.dsl=2

/*
 * Nextflow port of the GLIPH CWL Workflow
 */

params.outPrefix = "gliph_output"
params.inputPath = ""
// params.destinationPath = "s3://some-bucket/some-result"




params.script_file = "$projectDir/scripts/TIGERdb_inputPrep.R"
params.external_spcfc_file = "$projectDir/references/TIGERdb_MinimalScoreConfidence3_VersionII.tsv"

params.ref_CD48 = "$projectDir/references/human_v2.0/ref_CD48_v2.0.txt"
params.ref_V_CD48 = "$projectDir/references/human_v2.0/ref_V_CD48_v2.0.txt"
params.ref_L_CD48 = "$projectDir/references/human_v2.0/ref_L_CD48_v2.0.txt"

process INPUT_PREP {
    publishDir "${params.destinationPath}", mode: 'copy'
    container 'crescentdev/tidyverse-optparse:latest' // e.g., rocker/r-base

    input:
    path script_file
    path external_file
    path input_files

    output:
    path "*_GLIPH_INPUT.txt", emit: gliph_input
    path "parameter_file.txt", emit: parameter_file

    script:
    """
    export TMPDIR="."
    Rscript ${script_file} -e ${external_file} -d datasets.tsv -x . -p ${params.outPrefix}
    """
}

process RUN_GLIPH {
    publishDir "${params.destinationPath}", mode: 'copy'
    container 'crescentdev/gliph2:latest'

    input:
    path gliph_input
    path parameter_file
    path ref_cd48
    path ref_v
    path ref_l

    output:
    path "*_HLA.txt", emit: HLA_output, optional: true
    path "*_cluster.csv", emit: cluster_output
    path "*.log", emit: cluster_txt_output, optional: true
    path "*_kmer.txt", emit: kmer_output, optional: true
    path "*_kmer.log", emit: kmer_log_output, optional: true
    path "*_parameter.txt", emit: parameter_output, optional: true
    path "*_score.txt", emit: score_output

    script:
    """
    irtools.centos -c ${parameter_file}
    """
}

process CLEAN_CLUSTER {
    publishDir "${params.destinationPath}", mode: 'copy'
    container 'ubuntu:26.04'

    input:
    path cluster_csv

    output:
    path "${cluster_csv}", emit: cleaned_cluster_output
    path "original_${cluster_csv}", emit: original_cluster_output

    script:
    """
    mv "${cluster_csv}" "original_${cluster_csv}"
    sed '/^[[:space:]]*\$/d' "original_${cluster_csv}" | awk 'BEGIN{FS=OFS=","} {for(i=1;i<=NF;i++) if(\$i=="-") \$i=""; print}' > "${cluster_csv}"
    """
}

workflow {
    input_files_ch = channel.fromPath(params.inputPath ? params.inputPath.split(',').toList() : [])

    // Step 1: Prep Input
    prep_out = INPUT_PREP(
        params.script_file,
        params.external_spcfc_file,
        input_files_ch.collect()
    )

    // Step 2: Run GLIPH
    gliph_out = RUN_GLIPH(
        prep_out.gliph_input,
        prep_out.parameter_file,
        params.ref_CD48,
        params.ref_V_CD48,
        params.ref_L_CD48
    )

    // Step 3: Clean Cluster output
    clean_out = CLEAN_CLUSTER(gliph_out.cluster_output)
}
